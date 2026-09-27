import { notFound } from 'next/navigation';
import type { Locale } from '@/config/locales';
import { wordpressHref } from '@/config/wordpress';
import { findEvent, listMedia } from '@/features/events';
import { listConferenceSpeakers, listSpeakerCandidates } from '@/features/speakers';
import type { ResolvedSpeaker } from '@/features/speakers';
import { CMediaPicker, getStudioLocale } from '@/features/studio';
import { addSpeakerAction, removeSpeakerAction, updateSpeakerAction } from './actions';

const t = (he: string, en: string): Record<Locale, string> => ({ he, en });

const UI = {
  title: t('דוברים', 'Speakers'),
  sub: t('הרשימה שעמוד "דוברים" באתר מציג. דובר/ת שמקושרים לחשבון בפלטפורמה מקבלים ממנו שם, תפקיד ותמונה — כל שדה שתמלאו כאן גובר.', 'The list the site’s "Speakers" page shows. A speaker linked to a platform account borrows name, role and photo from it — anything you fill in here wins.'),
  viewOnSite: t('צפייה באתר', 'View on site'),
  add: t('הוספת דובר/ת', 'Add a speaker'),
  fromAccount: t('חשבון קיים בפלטפורמה (אופציונלי)', 'Existing platform account (optional)'),
  noAccount: t('— ללא חשבון, דובר/ת חיצוני/ת —', '— no account, external speaker —'),
  name: t('שם', 'Name'),
  jobTitle: t('תפקיד', 'Job title'),
  company: t('ארגון', 'Organisation'),
  bio: t('כמה מילים', 'Short bio'),
  photo: t('תמונה', 'Photo'),
  photoEmpty: t('ללא תמונה', 'No photo'),
  upload: t('העלאה', 'Upload'),
  he: t('עברית', 'Hebrew'),
  en: t('אנגלית', 'English'),
  enHint: t('ריק = הטקסט העברי', 'Empty = the Hebrew text'),
  save: t('שמירה', 'Save'),
  addButton: t('הוספה', 'Add'),
  remove: t('הסרה מהרשימה', 'Remove from the list'),
  linked: t('מקושר/ת לחשבון', 'Linked to an account'),
  onSite: t('מוצג באתר:', 'Shown on the site:'),
  empty: t('עדיין אין דוברים. הוסיפו את הראשון/ה למטה.', 'No speakers yet. Add the first one below.'),
  notices: {
    added: t('הדובר/ת נוספ/ה.', 'Speaker added.'),
    saved: t('נשמר.', 'Saved.'),
    removed: t('הוסר/ה.', 'Removed.'),
    'name-required': t('צריך שם, או חשבון לקשר אליו.', 'A name, or an account to link, is required.'),
  } as Record<string, Record<Locale, string>>,
};

const CARD = 'rounded-lg border border-[var(--c-line)] bg-[var(--c-panel)] p-5';
const INPUT = 'w-full rounded-md border border-[var(--c-line)] bg-[rgba(7,19,36,0.55)] px-3 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-bronze)]';
const LABEL = 'mb-1 block text-[11px] font-medium tracking-[0.08em] text-[var(--c-text-soft)]';
const BTN = 'inline-flex min-h-9 items-center rounded-md border border-[var(--c-line-strong)] px-3 text-sm text-[var(--c-text)] hover:border-[var(--c-bronze)] hover:text-[var(--c-bronze)]';
const BTN_PRIMARY = 'inline-flex min-h-9 items-center rounded-md bg-[var(--c-bronze)] px-4 text-sm font-semibold text-[var(--c-on-accent)] hover:bg-[var(--c-bronze-hover)]';

const Words = ({
  locale,
  lang,
  values,
  placeholders,
}: {
  locale: Locale;
  lang: Locale;
  values: { name?: string; jobTitle?: string; company?: string; bio?: string };
  placeholders?: { name?: string; jobTitle?: string; company?: string; bio?: string };
}) => {
  const dir = lang === 'he' ? 'rtl' : 'ltr';
  return (
    <div className="rounded-md border border-[var(--c-line)] p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <h4 className="text-xs font-semibold text-[var(--c-text)]">{UI[lang][locale]}</h4>
        {lang === 'en' ? <span className="text-[10px] text-[var(--c-text-faint)]">{UI.enHint[locale]}</span> : null}
      </div>
      <div className="grid gap-2">
        <label className="block">
          <span className={LABEL}>{UI.name[locale]}</span>
          <input name={`name_${lang}`} dir={dir} defaultValue={values.name ?? ''} placeholder={placeholders?.name} className={INPUT} />
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span className={LABEL}>{UI.jobTitle[locale]}</span>
            <input name={`jobTitle_${lang}`} dir={dir} defaultValue={values.jobTitle ?? ''} placeholder={placeholders?.jobTitle} className={INPUT} />
          </label>
          <label className="block">
            <span className={LABEL}>{UI.company[locale]}</span>
            <input name={`company_${lang}`} dir={dir} defaultValue={values.company ?? ''} placeholder={placeholders?.company} className={INPUT} />
          </label>
        </div>
        <label className="block">
          <span className={LABEL}>{UI.bio[locale]}</span>
          <textarea name={`bio_${lang}`} dir={dir} rows={3} defaultValue={values.bio ?? ''} placeholder={placeholders?.bio} className={`${INPUT} resize-y`} />
        </label>
      </div>
    </div>
  );
};

interface SpeakersPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ notice?: string }>;
}

const ConferenceSpeakersPage = async ({ params, searchParams }: SpeakersPageProps) => {
  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw);
  const { notice } = await searchParams;
  const locale = await getStudioLocale();
  const [summary, he, en, candidates, media] = await Promise.all([
    findEvent(slug).catch(() => null),
    listConferenceSpeakers(slug, 'he').catch(() => [] as ResolvedSpeaker[]),
    listConferenceSpeakers(slug, 'en', { fallback: false }).catch(() => [] as ResolvedSpeaker[]),
    listSpeakerCandidates(locale).catch(() => []),
    listMedia().catch(() => []),
  ]);
  if (!summary) {
    notFound();
  }
  const enById = new Map(en.map((speaker) => [speaker.id, speaker]));
  const images = media.filter((item) => !item.mimeType?.startsWith('video/'));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 px-6 py-6">
      <header className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-[var(--c-text)]">{UI.title[locale]}</h2>
          <p className="mt-1 text-xs text-[var(--c-text-soft)]">{UI.sub[locale]}</p>
        </div>
        <a href={wordpressHref('conferenceSpeakers', locale)} target="_blank" rel="noreferrer" className={BTN}>
          {UI.viewOnSite[locale]}
        </a>
      </header>
      {notice && UI.notices[notice] ? (
        <p role="status" className="rounded-md border border-[var(--c-line)] bg-[var(--c-panel)] px-4 py-2 text-sm">
          {UI.notices[notice]![locale]}
        </p>
      ) : null}

      {he.length === 0 ? <p className="text-sm text-[var(--c-text-soft)]">{UI.empty[locale]}</p> : null}

      {he.map((speaker) => {
        const other = enById.get(speaker.id);
        return (
          <form key={speaker.id} id={`speaker-${speaker.id}`} action={updateSpeakerAction} className={CARD}>
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="id" value={speaker.id} />
            <div className="mb-3 flex flex-wrap items-center gap-3">
              {speaker.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={speaker.photoUrl} alt="" className="size-12 rounded-full object-cover" />
              ) : (
                <span className="size-12 rounded-full bg-[rgba(255,255,255,0.08)]" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-[var(--c-text)]">{speaker.name}</h3>
                <p className="truncate text-xs text-[var(--c-text-soft)]">
                  <span className="text-[var(--c-text-faint)]">{UI.onSite[locale]} </span>
                  {[speaker.jobTitle, speaker.company].filter(Boolean).join(', ')}
                  {speaker.isRegistered ? ` · ${UI.linked[locale]}` : ''}
                </p>
              </div>
              <div className="ms-auto flex gap-2">
                <button type="submit" className={BTN_PRIMARY}>{UI.save[locale]}</button>
                <button type="submit" formAction={removeSpeakerAction} className={BTN}>{UI.remove[locale]}</button>
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-[1fr_1fr_220px]">
              <Words locale={locale} lang="he" values={speaker.own} placeholders={speaker.isRegistered ? { name: speaker.name, jobTitle: speaker.jobTitle, company: speaker.company, bio: speaker.bio } : undefined} />
              <Words locale={locale} lang="en" values={other?.own ?? {}} placeholders={{ name: speaker.own.name ?? speaker.name, jobTitle: speaker.own.jobTitle, company: speaker.own.company, bio: speaker.own.bio }} />
              <CMediaPicker name="photoId" label={UI.photo[locale]} defaultValue={speaker.own.photoId ?? ''} media={images} emptyLabel={UI.photoEmpty[locale]} uploadLabel={UI.upload[locale]} locale={locale} kind="image" />
            </div>
          </form>
        );
      })}

      <form action={addSpeakerAction} className={`${CARD} border-dashed`}>
        <input type="hidden" name="slug" value={slug} />
        <h3 className="mb-3 text-sm font-semibold text-[var(--c-text)]">{UI.add[locale]}</h3>
        <label className="mb-3 block">
          <span className={LABEL}>{UI.fromAccount[locale]}</span>
          <select name="accountId" defaultValue="" className={INPUT}>
            <option value="">{UI.noAccount[locale]}</option>
            {candidates.map((candidate) => (
              <option key={candidate.accountId} value={candidate.accountId}>
                {candidate.name}
                {candidate.company ? ` · ${candidate.company}` : ''}
                {candidate.email ? ` · ${candidate.email}` : ''}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_220px]">
          <Words locale={locale} lang="he" values={{}} />
          <Words locale={locale} lang="en" values={{}} />
          <CMediaPicker name="photoId" label={UI.photo[locale]} defaultValue="" media={images} emptyLabel={UI.photoEmpty[locale]} uploadLabel={UI.upload[locale]} locale={locale} kind="image" />
        </div>
        <div className="mt-4">
          <button type="submit" className={BTN_PRIMARY}>{UI.addButton[locale]}</button>
        </div>
      </form>
    </div>
  );
};

export const dynamic = 'force-dynamic';

export default ConferenceSpeakersPage;
