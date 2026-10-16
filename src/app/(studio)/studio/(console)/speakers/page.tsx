import Link from 'next/link';
import type { Locale } from '@/config/locales';
import { listMedia } from '@/features/events';
import {
  findSpeakerLookalikes,
  listSpeakerLibrary,
  type ResolvedSpeaker,
} from '@/features/speakers';
import {
  CMediaPicker,
  ConsoleDenied,
  ConsoleShell,
  SpeakerWordsFields,
  getStudioCreator,
  getStudioLocale,
  requireCapability,
} from '@/features/studio';
import ActionForm from './action-form';
import { deleteLibrarySpeakerAction, mergeSpeakersAction, saveLibrarySpeakerAction } from './actions';

/*
 * The speaker library: every speaker the organisation has ever put on a
 * stage, one card each, whichever conferences they spoke at. A speaker is
 * added to an activity from the activity itself (by searching this
 * library); here the cards are kept — their words and picture edited
 * once for every conference, and the cards that look like one person
 * folded into one, by a person who knows.
 */
const t = (he: string, en: string): Record<Locale, string> => ({ he, en });

const UI = {
  title: t('מאגר הדוברים', 'Speaker library'),
  sub: t(
    'כל הדוברים של הארגון — כרטיס אחד לכל אדם, לכל הכנסים. משבצים דובר/ת להרצאה מתוך הפעילות עצמה, בחיפוש במאגר; כאן עורכים פרטים, וממזגים כרטיסים כפולים.',
    'Every speaker of the organization — one card per person, for every conference. A speaker is put on an activity from the activity itself, by searching this library; here the details are edited and duplicate cards are merged.',
  ),
  search: t('חיפוש לפי שם, תפקיד או ארגון…', 'Search by name, role or organization…'),
  searchButton: t('חיפוש', 'Search'),
  clear: t('ניקוי', 'Clear'),
  count: t('{n} דוברים במאגר', '{n} speakers in the library'),
  lookalikes: t('כרטיסים שנראים כמו אותו אדם', 'Cards that look like one person'),
  lookalikesSub: t(
    'שמות דומים — למשל עם תואר ובלעדיו. אם זה אותו אדם, בחרו איזה כרטיס להשאיר: הוא יקבל את כל ההרצאות והכנסים של השאר, ואת הפרטים שחסרים לו. אם אלה אנשים שונים — פשוט השאירו.',
    'Similar names — say, with a title and without. If it is one person, choose which card to keep: it takes all the others’ activities and conferences, and any details it lacks. If they are different people, just leave them.',
  ),
  keep: t('להשאיר את הכרטיס הזה ולמזג אליו', 'Keep this card and merge into it'),
  registered: t('משתמש/ת רשום/ה', 'Registered user'),
  external: t('דובר/ת חיצוני/ת', 'External speaker'),
  noConference: t('לא מופיע/ה באף כנס', 'On no conference'),
  edit: t('עריכה', 'Edit'),
  save: t('שמירה — בכל הכנסים', 'Save — for every conference'),
  remove: t('מחיקה מהמאגר', 'Delete from the library'),
  photo: t('תמונה', 'Photo'),
  photoEmpty: t('ללא תמונה', 'No photo'),
  upload: t('העלאה', 'Upload'),
  empty: t('אין עדיין דוברים במאגר. דובר/ת נוסף/ה כשמשבצים אותו/ה לפעילות, או מעמוד הדוברים של כנס.', 'No speakers in the library yet. A speaker is added when put on an activity, or from a conference’s speakers page.'),
  noMatch: t('לא נמצאו דוברים בחיפוש הזה.', 'No speakers match this search.'),
  notices: {
    saved: t('נשמר — בכל הכנסים וההרצאות של הדובר/ת.', 'Saved — in every conference and activity of this speaker.'),
    merged: t('הכרטיסים מוזגו לכרטיס אחד.', 'The cards were merged into one.'),
    'merge-partial': t('חלק מהכרטיסים לא מוזגו — למשל שני חשבונות רשומים שונים.', 'Some cards were not merged — two different registered accounts, for example.'),
    deleted: t('הכרטיס נמחק מהמאגר.', 'The card was deleted from the library.'),
    'in-use': t('אי אפשר למחוק דובר/ת שמופיע/ה בכנס. הסירו אותו/ה קודם מההרצאות ומרשימת הדוברים.', 'A speaker shown on a conference cannot be deleted. Take them off the activities and the speakers list first.'),
  } as Record<string, Record<Locale, string>>,
};

const CARD = 'rounded-lg border border-[var(--c-line)] bg-[var(--c-panel)] p-4';
const INPUT = 'w-full rounded-md border border-[var(--c-line)] bg-[rgba(7,19,36,0.55)] px-3 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-bronze)]';
const BTN = 'inline-flex min-h-9 items-center rounded-md border border-[var(--c-line-strong)] px-3 text-sm text-[var(--c-text)] hover:border-[var(--c-bronze)] hover:text-[var(--c-bronze)]';
const BTN_PRIMARY = 'inline-flex min-h-9 items-center rounded-md bg-[var(--c-bronze)] px-4 text-sm font-semibold text-[var(--c-on-accent)] hover:bg-[var(--c-bronze-hover)]';

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase() || '?';

const Face = ({ speaker }: { speaker: ResolvedSpeaker }) =>
  speaker.photoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- a portrait from the media API, size unknown at build time
    <img src={speaker.photoUrl} alt="" className="size-10 shrink-0 rounded-full object-cover" />
  ) : (
    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--c-bronze)]/20 text-xs font-semibold text-[var(--c-bronze)]">
      {initials(speaker.name)}
    </span>
  );

const Who = ({ speaker, locale }: { speaker: ResolvedSpeaker; locale: Locale }) => (
  <div className="min-w-0 flex-1">
    <p className="flex flex-wrap items-center gap-2">
      <span className="truncate text-sm font-semibold text-[var(--c-text)]">{speaker.name}</span>
      <span className="rounded-full bg-[rgba(255,255,255,0.06)] px-2 py-0.5 text-[10px] text-[var(--c-text-soft)]">
        {speaker.isRegistered ? UI.registered[locale] : UI.external[locale]}
      </span>
    </p>
    {speaker.jobTitle || speaker.company ? (
      <p className="truncate text-xs text-[var(--c-text-soft)]">{[speaker.jobTitle, speaker.company].filter(Boolean).join(' · ')}</p>
    ) : null}
    <p className="mt-1 flex flex-wrap gap-1">
      {(speaker.conferences ?? []).length === 0 ? (
        <span className="text-[11px] text-[var(--c-text-faint)]">{UI.noConference[locale]}</span>
      ) : (
        (speaker.conferences ?? []).map((conference) => (
          <span key={conference.slug} className="rounded-full border border-[var(--c-line)] px-2 py-0.5 text-[10px] text-[var(--c-text-soft)]">
            {conference.title}
          </span>
        ))
      )}
    </p>
  </div>
);

interface SpeakerLibraryPageProps {
  searchParams: Promise<{ q?: string; notice?: string }>;
}

const SpeakerLibraryPage = async ({ searchParams }: SpeakerLibraryPageProps) => {
  const locale = await getStudioLocale();
  const creator = await getStudioCreator();
  const { q = '', notice } = await searchParams;
  if (!(await requireCapability('events:manage')) && !(await requireCapability('activities:manage'))) {
    return <ConsoleDenied locale={locale} title={UI.title[locale]} userName={creator?.name ?? ''} />;
  }
  const [library, english, media] = await Promise.all([
    listSpeakerLibrary(locale).catch(() => [] as ResolvedSpeaker[]),
    listSpeakerLibrary('en', { fallback: false }).catch(() => [] as ResolvedSpeaker[]),
    listMedia().catch(() => []),
  ]);
  const hebrew = locale === 'he' ? library : await listSpeakerLibrary('he', { fallback: false }).catch(() => [] as ResolvedSpeaker[]);
  const heById = new Map(hebrew.map((speaker) => [speaker.id, speaker]));
  const enById = new Map(english.map((speaker) => [speaker.id, speaker]));
  const images = media.filter((item) => !item.mimeType?.startsWith('video/'));
  const lookalikes = findSpeakerLookalikes(library, enById);
  const needle = q.trim().toLowerCase();
  const shown = needle
    ? library.filter((speaker) =>
        [speaker.name, speaker.jobTitle, speaker.company, enById.get(speaker.id)?.own.name]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(needle)),
      )
    : library;

  return (
    <ConsoleShell
      locale={locale}
      userName={creator?.name ?? ''}
      breadcrumb={<span className="font-medium text-[var(--c-text)]">{UI.title[locale]}</span>}
    >
      <div className="mx-auto flex h-full max-w-5xl flex-col gap-5 overflow-y-auto px-6 py-8">
        <header>
          <h1 className="font-display text-3xl font-medium">{UI.title[locale]}</h1>
          <p className="mt-1 max-w-3xl text-sm text-[var(--c-text-soft)]">{UI.sub[locale]}</p>
        </header>

        {notice && UI.notices[notice] ? (
          <p role="status" className="rounded-md border border-[var(--c-line)] bg-[var(--c-panel)] px-4 py-2 text-sm">
            {UI.notices[notice]![locale]}
          </p>
        ) : null}

        {lookalikes.length > 0 ? (
          <section className={`${CARD} border-[var(--c-bronze)]/50`} aria-labelledby="lookalikes-title">
            <h2 id="lookalikes-title" className="text-sm font-semibold text-[var(--c-text)]">
              {UI.lookalikes[locale]}
            </h2>
            <p className="mt-1 text-xs text-[var(--c-text-soft)]">{UI.lookalikesSub[locale]}</p>
            <ul className="mt-4 flex flex-col gap-4">
              {lookalikes.map((group) => (
                <li key={group.key} className="rounded-md border border-[var(--c-line)] p-3">
                  <ul className="flex flex-col gap-3">
                    {group.speakers.map((speaker) => (
                      <li key={speaker.id} className="flex flex-wrap items-center gap-3">
                        <Face speaker={speaker} />
                        <Who speaker={speaker} locale={locale} />
                        <ActionForm action={mergeSpeakersAction}>
                          <input type="hidden" name="keepId" value={speaker.id} />
                          {group.speakers
                            .filter((other) => other.id !== speaker.id)
                            .map((other) => (
                              <input key={other.id} type="hidden" name="foldId" value={other.id} />
                            ))}
                          <button type="submit" className={BTN}>
                            {UI.keep[locale]}
                          </button>
                        </ActionForm>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <form className="flex flex-wrap items-center gap-2" role="search">
          <input name="q" defaultValue={q} placeholder={UI.search[locale]} className={`${INPUT} max-w-md`} />
          <button type="submit" className={BTN}>{UI.searchButton[locale]}</button>
          {q ? (
            <Link href="/studio/speakers" className="text-xs text-[var(--c-text-faint)] hover:text-[var(--c-text)]">
              {UI.clear[locale]}
            </Link>
          ) : null}
          <span className="ms-auto text-xs text-[var(--c-text-faint)]">{UI.count[locale].replace('{n}', String(library.length))}</span>
        </form>

        {library.length === 0 ? <p className="text-sm text-[var(--c-text-soft)]">{UI.empty[locale]}</p> : null}
        {library.length > 0 && shown.length === 0 ? <p className="text-sm text-[var(--c-text-soft)]">{UI.noMatch[locale]}</p> : null}

        <ul className="flex flex-col gap-3">
          {shown.map((speaker) => {
            const he = heById.get(speaker.id);
            const en = enById.get(speaker.id);
            return (
              <li key={speaker.id} id={`speaker-${speaker.id}`} className={CARD}>
                <details>
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3">
                    <Face speaker={speaker} />
                    <Who speaker={speaker} locale={locale} />
                    <span className={BTN}>{UI.edit[locale]}</span>
                  </summary>
                  <ActionForm action={saveLibrarySpeakerAction} className="mt-4 block">
                    <input type="hidden" name="id" value={speaker.id} />
                    <div className="grid gap-3 lg:grid-cols-[1fr_1fr_220px]">
                      <SpeakerWordsFields
                        locale={locale}
                        lang="he"
                        values={he?.own ?? {}}
                        placeholders={speaker.isRegistered ? { name: speaker.name, jobTitle: speaker.jobTitle, company: speaker.company, bio: speaker.bio } : undefined}
                      />
                      <SpeakerWordsFields
                        locale={locale}
                        lang="en"
                        values={en?.own ?? {}}
                        placeholders={{ name: he?.own.name ?? speaker.name, jobTitle: he?.own.jobTitle, company: he?.own.company, bio: he?.own.bio }}
                      />
                      <CMediaPicker
                        name="photoId"
                        label={UI.photo[locale]}
                        defaultValue={speaker.own.photoId ?? ''}
                        media={images}
                        emptyLabel={UI.photoEmpty[locale]}
                        uploadLabel={UI.upload[locale]}
                        locale={locale}
                        kind="image"
                        crop={1}
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="submit" className={BTN_PRIMARY}>{UI.save[locale]}</button>
                    </div>
                  </ActionForm>
                  {(speaker.conferences ?? []).length === 0 ? (
                    <ActionForm action={deleteLibrarySpeakerAction} className="mt-2 block">
                      <input type="hidden" name="id" value={speaker.id} />
                      <button type="submit" className={BTN}>
                        {UI.remove[locale]}
                      </button>
                    </ActionForm>
                  ) : null}
                </details>
              </li>
            );
          })}
        </ul>
      </div>
    </ConsoleShell>
  );
};

export const dynamic = 'force-dynamic';

export default SpeakerLibraryPage;
