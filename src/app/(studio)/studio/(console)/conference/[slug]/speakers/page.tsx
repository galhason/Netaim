import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Locale } from '@/config/locales';
import { wordpressHref } from '@/config/wordpress';
import { findEvent, listMedia } from '@/features/events';
import { listConferenceSpeakers, listSpeakerCandidates, listSpeakerLibrary } from '@/features/speakers';
import type { ResolvedSpeaker } from '@/features/speakers';
import { AccountCombobox, CMediaPicker, SpeakerWordsFields as Words, getStudioLocale } from '@/features/studio';
import { addSpeakerAction, listFromLibraryAction, removeSpeakerAction, updateSpeakerAction } from './actions';

const t = (he: string, en: string): Record<Locale, string> => ({ he, en });

const UI = {
  title: t('דוברים', 'Speakers'),
  sub: t('הרשימה שעמוד "דוברים" באתר מציג: כל מי שמשובץ להרצאה בכנס, ועוד מי שהוספתם כאן ידנית. דובר/ת שמקושרים לחשבון בפלטפורמה מקבלים ממנו שם, תפקיד ותמונה — כל שדה שתמלאו כאן גובר.', 'The list the site’s "Speakers" page shows: everyone an activity of this conference names, plus anyone added here by hand. A speaker linked to a platform account borrows name, role and photo from it — anything you fill in here wins.'),
  shared: t('כל דובר/ת הוא כרטיס אחד במאגר הדוברים של הארגון — עריכה כאן משנה את הכרטיס בכל הכנסים וההרצאות שלו.', 'Each speaker is one card in the organization’s speaker library — an edit here changes the card in every conference and activity.'),
  library: t('מאגר הדוברים', 'Speaker library'),
  fromLibrary: t('הוספה מהמאגר', 'Add from the library'),
  fromLibraryLabel: t('דובר/ת שכבר במאגר', 'A speaker already in the library'),
  fromLibraryHint: t('הדובר/ת יופיע/ו בעמוד הדוברים של הכנס גם בלי הרצאה.', 'They appear on this conference’s speakers page even without an activity.'),
  fromLibraryNone: t('לא נמצא/ה במאגר בשם הזה.', 'No one by that name in the library.'),
  fromLibraryChosen: t('נבחר/ה:', 'Chosen:'),
  listButton: t('הוספה לכנס', 'Add to the conference'),
  newOne: t('דובר/ת חדש/ה', 'A new speaker'),
  newHint: t('אם כבר יש במאגר דובר/ת באותו שם או עם אותו חשבון — ייעשה שימוש בכרטיס הקיים, בלי כפילות.', 'If the library already holds a speaker by that name or with that account, the existing card is used — no duplicate.'),
  scheduled: t('משובץ/ת ל־{n} פעילויות', 'On {n} activities'),
  scheduledOne: t('משובץ/ת לפעילות אחת', 'On one activity'),
  listedByHand: t('נוסף/ה ידנית', 'Added by hand'),
  stays: t('מופיע/ה כל עוד משובץ/ת לפעילות בכנס', 'Shown while an activity here names them'),
  viewOnSite: t('צפייה באתר', 'View on site'),
  fromAccount: t('חשבון קיים בפלטפורמה (אופציונלי)', 'Existing platform account (optional)'),
  name: t('שם', 'Name'),
  jobTitle: t('תפקיד', 'Job title'),
  company: t('ארגון', 'Organization'),
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
    removed: t('הוסר/ה מהרשימה. הכרטיס נשאר במאגר.', 'Removed from the list. The card stays in the library.'),
    'still-scheduled': t('הוסר/ה מהרשימה הידנית, אבל עדיין מופיע/ה — כי משובץ/ת לפעילות בכנס. כדי להוריד, הסירו אותו/ה מהפעילות.', 'Taken off the hand-made list, but still shown — an activity here names them. Remove them from the activity to take them off.'),
    'pick-required': t('בחרו דובר/ת מהמאגר.', 'Pick a speaker from the library.'),
    'name-required': t('צריך שם, או חשבון לקשר אליו.', 'A name, or an account to link, is required.'),
  } as Record<string, Record<Locale, string>>,
};

const CARD = 'rounded-lg border border-[var(--c-line)] bg-[var(--c-panel)] p-5';
const INPUT = 'w-full rounded-md border border-[var(--c-line)] bg-[rgba(7,19,36,0.55)] px-3 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-bronze)]';
const BTN = 'inline-flex min-h-9 items-center rounded-md border border-[var(--c-line-strong)] px-3 text-sm text-[var(--c-text)] hover:border-[var(--c-bronze)] hover:text-[var(--c-bronze)]';
const BTN_PRIMARY = 'inline-flex min-h-9 items-center rounded-md bg-[var(--c-bronze)] px-4 text-sm font-semibold text-[var(--c-on-accent)] hover:bg-[var(--c-bronze-hover)]';

interface SpeakersPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ notice?: string }>;
}

const ConferenceSpeakersPage = async ({ params, searchParams }: SpeakersPageProps) => {
  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw);
  const { notice } = await searchParams;
  const locale = await getStudioLocale();
  const [summary, he, en, candidates, media, library] = await Promise.all([
    findEvent(slug).catch(() => null),
    listConferenceSpeakers(slug, 'he').catch(() => [] as ResolvedSpeaker[]),
    listConferenceSpeakers(slug, 'en', { fallback: false }).catch(() => [] as ResolvedSpeaker[]),
    listSpeakerCandidates(locale).catch(() => []),
    listMedia().catch(() => []),
    listSpeakerLibrary(locale).catch(() => [] as ResolvedSpeaker[]),
  ]);
  if (!summary) {
    notFound();
  }
  const enById = new Map(en.map((speaker) => [speaker.id, speaker]));
  const onRoster = new Set(he.map((speaker) => speaker.id));
  const offRoster = library.filter((speaker) => !onRoster.has(speaker.id));
  const presenceOf = (speaker: ResolvedSpeaker): string =>
    [
      speaker.presence?.activities === 1
        ? UI.scheduledOne[locale]
        : speaker.presence?.activities
          ? UI.scheduled[locale].replace('{n}', String(speaker.presence.activities))
          : '',
      speaker.presence?.listed ? UI.listedByHand[locale] : '',
    ]
      .filter(Boolean)
      .join(' · ');
  const images = media.filter((item) => !item.mimeType?.startsWith('video/'));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 px-6 py-6">
      <header className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-[var(--c-text)]">{UI.title[locale]}</h2>
          <p className="mt-1 text-xs text-[var(--c-text-soft)]">{UI.sub[locale]}</p>
        </div>
        <Link href="/studio/speakers" className={BTN}>
          {UI.library[locale]}
        </Link>
        <a href={wordpressHref('conferenceSpeakers', locale)} target="_blank" rel="noreferrer" className={BTN}>
          {UI.viewOnSite[locale]}
        </a>
      </header>
      <p className="-mt-2 text-xs text-[var(--c-text-faint)]">{UI.shared[locale]}</p>
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
                {presenceOf(speaker) ? (
                  <p className="mt-0.5 text-[11px] text-[var(--c-text-faint)]">{presenceOf(speaker)}</p>
                ) : null}
              </div>
              <div className="ms-auto flex items-center gap-2">
                <button type="submit" className={BTN_PRIMARY}>{UI.save[locale]}</button>
                {speaker.presence?.listed ? (
                  <button type="submit" formAction={removeSpeakerAction} className={BTN}>{UI.remove[locale]}</button>
                ) : (
                  <span className="max-w-40 text-[11px] leading-tight text-[var(--c-text-faint)]">{UI.stays[locale]}</span>
                )}
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-[1fr_1fr_220px]">
              <Words locale={locale} lang="he" values={speaker.own} placeholders={speaker.isRegistered ? { name: speaker.name, jobTitle: speaker.jobTitle, company: speaker.company, bio: speaker.bio } : undefined} />
              <Words locale={locale} lang="en" values={other?.own ?? {}} placeholders={{ name: speaker.own.name ?? speaker.name, jobTitle: speaker.own.jobTitle, company: speaker.own.company, bio: speaker.own.bio }} />
              <CMediaPicker name="photoId" label={UI.photo[locale]} defaultValue={speaker.own.photoId ?? ''} media={images} emptyLabel={UI.photoEmpty[locale]} uploadLabel={UI.upload[locale]} locale={locale} kind="image" crop={1} />
            </div>
          </form>
        );
      })}

      <form action={listFromLibraryAction} className={`${CARD} border-dashed`}>
        <input type="hidden" name="slug" value={slug} />
        <h3 className="mb-3 text-sm font-semibold text-[var(--c-text)]">{UI.fromLibrary[locale]}</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-64 max-w-xl flex-1">
            <AccountCombobox
              name="speakerId"
              label={UI.fromLibraryLabel[locale]}
              locale={locale}
              className={INPUT}
              copy={{ hint: UI.fromLibraryHint[locale], none: UI.fromLibraryNone[locale], linked: UI.fromLibraryChosen[locale] }}
              options={offRoster.map((speaker) => ({
                accountId: speaker.id,
                name: speaker.name,
                ...(speaker.company ? { company: speaker.company } : {}),
                ...(speaker.jobTitle ? { jobTitle: speaker.jobTitle } : {}),
                ...(speaker.photoUrl ? { photoUrl: speaker.photoUrl } : {}),
              }))}
            />
          </div>
          <button type="submit" className={`${BTN_PRIMARY} mb-5`}>{UI.listButton[locale]}</button>
        </div>
      </form>

      <form action={addSpeakerAction} className={`${CARD} border-dashed`}>
        <input type="hidden" name="slug" value={slug} />
        <h3 className="text-sm font-semibold text-[var(--c-text)]">{UI.newOne[locale]}</h3>
        <p className="mb-3 mt-1 text-xs text-[var(--c-text-faint)]">{UI.newHint[locale]}</p>
        <div className="mb-3 max-w-xl">
          <AccountCombobox
            name="accountId"
            label={UI.fromAccount[locale]}
            locale={locale}
            className={INPUT}
            options={candidates.map((candidate) => ({
              accountId: candidate.accountId,
              name: candidate.name,
              ...(candidate.company ? { company: candidate.company } : {}),
              ...(candidate.jobTitle ? { jobTitle: candidate.jobTitle } : {}),
              ...(candidate.email ? { email: candidate.email } : {}),
              ...(candidate.photoUrl ? { photoUrl: candidate.photoUrl } : {}),
            }))}
          />
        </div>
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_220px]">
          <Words locale={locale} lang="he" values={{}} />
          <Words locale={locale} lang="en" values={{}} />
          <CMediaPicker name="photoId" label={UI.photo[locale]} defaultValue="" media={images} emptyLabel={UI.photoEmpty[locale]} uploadLabel={UI.upload[locale]} locale={locale} kind="image" crop={1} />
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
