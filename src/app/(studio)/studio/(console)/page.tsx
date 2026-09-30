import Link from 'next/link';
import type { Locale } from '@/config/locales';
import { wordpressHref } from '@/config/wordpress';
import { getActiveConferenceSlug, listEvents } from '@/features/events';
import { listGallerySubmissions } from '@/features/gallery';
import { countOpenReports } from '@/features/networking';
import { listAgenda } from '@/features/program';
import { getRegistrationCounts } from '@/features/registration';
import { listConferenceSpeakers } from '@/features/speakers';
import {
  CONSOLE_UI,
  ConsoleShell,
  getStudioAccess,
  getStudioLocale,
  requireCapability,
} from '@/features/studio';
import { marketingRepository } from '@/infrastructure';
import { ROLE_CAPABILITIES, type Capability } from '@/permission-engine';
import { formatDayLabel } from '@/shared';
import { setActiveConferenceAction } from './actions';

/*
 * Open safety reports, for the badge on the rail. Counted only for the
 * people who may act on them: a number is information too, and a role
 * that cannot open the screen has no business knowing it is not empty.
 */
const openReportsFor = async (): Promise<number> =>
  (await requireCapability('participants:manage')) ? countOpenReports() : 0;

/* Photographs waiting for review on the live conference, for those who review them. */
const pendingGalleryFor = async (slug: string | null): Promise<number> =>
  slug && (await requireCapability('gallery:manage', slug))
    ? (await listGallerySubmissions(slug)).length
    : 0;

const t = (he: string, en: string): Record<Locale, string> => ({ he, en });

const UI = {
  title: t('הכנסים', 'Conferences'),
  sub: t('הכנס הפעיל הוא מה שהאתר מציג. כל השאר — טיוטות, כנסים שהיו, ומה שיבוא.', 'The active conference is what the site shows. Everything else — drafts, past conferences, and what comes next.'),
  active: t('הכנס הפעיל', 'Active conference'),
  noActive: t('אין כנס פעיל. בחרו כנס והגדירו אותו כפעיל בהגדרות שלו.', 'No active conference. Pick one and make it active in its settings.'),
  registrations: t('נרשמים', 'Registered'),
  pending: t('ממתינים', 'Pending'),
  waitlisted: t('ברשימת המתנה', 'Waitlisted'),
  sessions: t('פעילויות', 'Activities'),
  speakers: t('דוברים', 'Speakers'),
  content: t('עריכת תוכן', 'Edit content'),
  settings: t('הגדרות', 'Settings'),
  viewOnSite: t('צפייה באתר', 'View on site'),
  all: t('כל הכנסים', 'All conferences'),
  open: t('פתיחה', 'Open'),
  makeActive: t('הגדרה כפעיל', 'Make active'),
  live: t('מפורסם', 'Published'),
  changes: t('שינויים לא פורסמו', 'Unpublished changes'),
  draft: t('טיוטה', 'Draft'),
  archived: t('בארכיון', 'Archived'),
  activeTag: t('פעיל', 'Active'),
  none: t('עדיין אין כנסים.', 'No conferences yet.'),
  platformHome: t('דף הבית של הפלטפורמה', 'Platform home page'),
  platformHomeSub: t('העמוד הפנימי /he — לא האתר הציבורי.', 'The internal /he page — not the public site.'),
};

const CARD = 'rounded-lg border border-[var(--c-line)] bg-[var(--c-panel)]';
const BTN = 'inline-flex min-h-9 items-center rounded-md border border-[var(--c-line-strong)] px-3 text-sm text-[var(--c-text)] hover:border-[var(--c-bronze)] hover:text-[var(--c-bronze)]';
const BTN_PRIMARY = 'inline-flex min-h-9 items-center rounded-md bg-[var(--c-bronze)] px-4 text-sm font-semibold text-[var(--c-on-accent)] hover:bg-[var(--c-bronze-hover)]';

const stateOf = (event: { launched: boolean; phase: string }, published: boolean) =>
  event.phase === 'archived' ? 'archived' : event.launched ? 'live' : published ? 'changes' : 'draft';

const StateTag = ({ state, locale }: { state: 'live' | 'changes' | 'draft' | 'archived'; locale: Locale }) => (
  <span
    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
      state === 'live'
        ? 'bg-[rgba(52,211,153,0.15)] text-[var(--c-live)]'
        : state === 'changes'
          ? 'bg-[rgba(245,158,11,0.15)] text-[var(--c-bronze)]'
          : 'bg-[rgba(255,255,255,0.08)] text-[var(--c-text-soft)]'
    }`}
  >
    {UI[state][locale]}
  </span>
);

const ConsolePage = async () => {
  const locale = await getStudioLocale();
  const access = await getStudioAccess();
  const creator = access?.creator ?? null;
  const held = new Set<Capability>(
    (access?.grants ?? []).flatMap((grant) => ROLE_CAPABILITIES[grant.role] ?? []),
  );
  const may = (capability: Capability) => held.has(capability);
  const [events, activeSlug, openReports] = await Promise.all([
    listEvents().catch(() => []),
    getActiveConferenceSlug(locale).catch(() => null),
    openReportsFor().catch(() => 0),
  ]);
  const pendingGallery = await pendingGalleryFor(activeSlug).catch(() => 0);
  const publishedFlags = await Promise.all(
    events.map((event) => marketingRepository.findPublishedIdentity(event.slug, 'he').then(Boolean).catch(() => false)),
  );
  const publishedBySlug = new Map(events.map((event, index) => [event.slug, publishedFlags[index] ?? false]));
  const active = events.find((event) => event.slug === activeSlug) ?? null;
  const [counts, agenda, speakers] = active
    ? await Promise.all([
        getRegistrationCounts(active.slug).catch(() => ({ confirmed: 0, pending: 0, waitlisted: 0 })),
        listAgenda(active.slug, 'he').catch(() => []),
        listConferenceSpeakers(active.slug, 'he').catch(() => []),
      ])
    : [null, [], []];
  const dates = (event: { startsAt?: string; endsAt?: string }) =>
    event.startsAt
      ? `${formatDayLabel(event.startsAt, locale)}${event.endsAt ? ` – ${formatDayLabel(event.endsAt, locale)}` : ''}`
      : '';

  return (
    <ConsoleShell
      locale={locale}
      userName={creator?.name ?? ''}
      openReports={openReports}
      pendingGallery={pendingGallery}
      breadcrumb={<span className="font-medium text-[var(--c-text)]">{UI.title[locale]}</span>}
    >
      <div className="mx-auto flex h-full max-w-5xl flex-col gap-6 overflow-y-auto px-6 py-8">
        <header className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold text-[var(--c-text)]">{UI.title[locale]}</h1>
            <p className="mt-1 text-sm text-[var(--c-text-soft)]">{UI.sub[locale]}</p>
          </div>
          {may('events:manage') ? (
            <Link href="/studio/new" className={BTN_PRIMARY}>
              {CONSOLE_UI.newExperience[locale]}
            </Link>
          ) : null}
        </header>

        {/* the active conference */}
        <section className={`${CARD} p-5`}>
          <p className="text-[10px] font-medium tracking-[0.16em] text-[var(--c-text-faint)]">{UI.active[locale]}</p>
          {active && counts ? (
            <>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-semibold text-[var(--c-text)]">{active.title}</h2>
                <StateTag state={stateOf(active, publishedBySlug.get(active.slug) ?? false)} locale={locale} />
                <span className="text-sm text-[var(--c-text-soft)]">{dates(active)}</span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {[
                  [UI.registrations, counts.confirmed],
                  [UI.pending, counts.pending],
                  [UI.waitlisted, counts.waitlisted],
                  [UI.sessions, agenda.length],
                  [UI.speakers, speakers.length],
                ].map(([label, value]) => (
                  <div key={(label as Record<Locale, string>).en} className="rounded-md border border-[var(--c-line)] px-3 py-2">
                    <dt className="text-[11px] text-[var(--c-text-soft)]">{(label as Record<Locale, string>)[locale]}</dt>
                    <dd className="text-lg font-semibold text-[var(--c-text)]">{value as number}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                {may('events:manage') ? (
                  <>
                    <Link href={`/studio/conference/${active.slug}/content`} className={BTN_PRIMARY}>
                      {UI.content[locale]}
                    </Link>
                    <Link href={`/studio/conference/${active.slug}/speakers`} className={BTN}>{UI.speakers[locale]}</Link>
                  </>
                ) : null}
                {may('activities:read') ? <Link href="/studio/activity" className={BTN}>{UI.sessions[locale]}</Link> : null}
                {may('participants:read') ? <Link href="/studio/participants" className={BTN}>{UI.registrations[locale]}</Link> : null}
                {may('events:manage') ? <Link href={`/studio/conference/${active.slug}/settings`} className={BTN}>{UI.settings[locale]}</Link> : null}
                <a href={wordpressHref('conferences', locale)} target="_blank" rel="noreferrer" className={`${BTN} ms-auto`}>
                  {UI.viewOnSite[locale]}
                </a>
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-[var(--c-text-soft)]">{UI.noActive[locale]}</p>
          )}
        </section>

        {/* every conference */}
        <section className={CARD}>
          <h2 className="border-b border-[var(--c-line)] px-5 py-3 text-sm font-semibold text-[var(--c-text)]">{UI.all[locale]}</h2>
          {events.length === 0 ? (
            <p className="px-5 py-4 text-sm text-[var(--c-text-soft)]">{UI.none[locale]}</p>
          ) : (
            <ul>
              {events.map((event) => {
                const isActive = event.slug === activeSlug;
                return (
                  <li key={event.slug} className="flex flex-wrap items-center gap-3 border-b border-[var(--c-line)] px-5 py-3 last:border-b-0">
                    <div className="min-w-0 flex-1">
                      {may('events:manage') ? (
                        <Link href={`/studio/conference/${event.slug}/content`} className="text-sm font-medium text-[var(--c-text)] hover:text-[var(--c-bronze)]">
                          {event.title}
                        </Link>
                      ) : (
                        <span className="text-sm font-medium text-[var(--c-text)]">{event.title}</span>
                      )}
                      <p className="text-xs text-[var(--c-text-soft)]">
                        <span dir="ltr">{event.slug}</span>
                        {dates(event) ? ` · ${dates(event)}` : ''}
                      </p>
                    </div>
                    {isActive ? (
                      <span className="rounded-full bg-[rgba(52,211,153,0.15)] px-2 py-0.5 text-[11px] font-medium text-[var(--c-live)]">{UI.activeTag[locale]}</span>
                    ) : null}
                    <StateTag state={stateOf(event, publishedBySlug.get(event.slug) ?? false)} locale={locale} />
                    {may('events:manage') ? (
                      <Link href={`/studio/conference/${event.slug}/content`} className={BTN}>{UI.open[locale]}</Link>
                    ) : null}
                    {!isActive && event.launched && may('experiences:manage') ? (
                      <form action={setActiveConferenceAction}>
                        <input type="hidden" name="slug" value={event.slug} />
                        <button type="submit" className={BTN}>{UI.makeActive[locale]}</button>
                      </form>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {may('experiences:manage') ? (
          <p className="text-xs text-[var(--c-text-faint)]">
            <Link href="/studio/homepage" className="underline underline-offset-4 hover:text-[var(--c-bronze)]">{UI.platformHome[locale]}</Link>
            {' · '}
            {UI.platformHomeSub[locale]}
          </p>
        ) : null}
      </div>
    </ConsoleShell>
  );
};

export const dynamic = 'force-dynamic';

export default ConsolePage;
