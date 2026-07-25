import Link from 'next/link';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isSupportedLocale } from '@/config/locales';
import {
  ACCOUNT_STATUS_LABELS,
  ACCOUNT_UI,
  getMyAccount,
} from '@/features/account';
import type { AccountConference } from '@/features/account';
import {
  LoungeNote,
  LoungeView,
  buildPlatformLounge,
  getAttendeeExperience,
  loungeField,
  loungeGhost,
  loungeLabel,
  loungePrimary,
  loungeQuiet,
} from '@/features/attendee';
import { myConnections, myUnreadByConnection } from '@/features/networking';
import { listPlatformParticipants } from '@/infrastructure';
import { PASSWORD_POLICY_TEXT } from '@/features/registration';
import { getActiveConferenceSlug } from '@/features/events';
import { listAgenda, myActivities } from '@/features/program';
import type { SessionSummary } from '@/features/program';
import { formatDayLabel, formatTimeLabel } from '@/shared';
import {
  joinConferenceAction,
  leaveConferenceAction,
  openAccountAction,
  requestAccountLinkAction,
  signInAction,
  signOutAction,
  totpSignInAction,
} from './actions';

/*
 * The door into the Personal Lounge. One conference — the guest walks
 * straight into it; the account screen appears only when there is a
 * choice to make, and even then it speaks the Lounge's language:
 * the conference's warmth, not a form's silence.
 */
interface AccountPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    state?: string;
    ticket?: string;
    totpError?: string;
    with?: string;
    link?: string;
    detail?: string;
    view?: string;
    event?: string;
  }>;
}

/*
 * The conference whose day is nearest owns the Lounge; past ones step
 * back. With no upcoming conference the latest one keeps the room warm.
 */
const leadConference = (
  joined: AccountConference[],
): AccountConference | null => {
  if (joined.length === 0) {
    return null;
  }
  const now = Date.now();
  const stamped = joined.map((conference) => ({
    conference,
    start: Date.parse(conference.startsAt ?? ''),
  }));
  const upcoming = stamped
    .filter((entry) => !Number.isNaN(entry.start) && entry.start >= now)
    .sort((a, b) => a.start - b.start);
  const first = upcoming[0] ?? null;
  if (first) {
    return first.conference;
  }
  const past = stamped
    .filter((entry) => !Number.isNaN(entry.start))
    .sort((a, b) => b.start - a.start);
  const latest = past[0] ?? null;
  return latest ? latest.conference : joined[0] ?? null;
};

const DELAYS = ['', '[animation-delay:60ms]', '[animation-delay:120ms]', '[animation-delay:180ms]'] as const;

const Atmosphere = () => (
  <span aria-hidden="true" className="absolute inset-0 overflow-hidden">
    <span className="absolute inset-0 bg-[var(--l-navy)]" />
    <span className="absolute -top-32 left-1/2 h-[30rem] w-[48rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(201,169,110,0.4),transparent_70%)]" />
    <span className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-[var(--l-bg)]" />
  </span>
);

const AccountPage = async ({ params, searchParams }: AccountPageProps) => {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const {
    state,
    ticket,
    totpError,
    with: conflictWith,
    link,
    detail,
    view,
    event: eventParam,
  } = await searchParams;
  const account = await getMyAccount(locale);
  const ui = ACCOUNT_UI;
  const he = locale === 'he';

  if (!account) {
    return (
      <main
        id="main-content"
        className="lounge relative min-h-dvh bg-[var(--l-bg)] font-body text-[var(--l-ink)]"
      >
        <div className="relative h-64 md:h-72">
          <Atmosphere />
          <div className="relative mx-auto flex h-full max-w-xl flex-col px-6">
            <div className="flex items-center justify-between pt-6 text-white/85">
              <Link
                href={`/${locale}`}
                className="text-sm transition-opacity hover:opacity-75"
              >
                ← {he ? 'לדף הבית' : 'Home'}
              </Link>
              <span className="font-display text-sm font-semibold tracking-[0.3em]">
                נטעים
              </span>
            </div>
            <div className="mt-auto pb-16 text-white">
              <p className="text-xs font-medium tracking-[0.18em] text-[var(--l-bronze-soft,#d8b98a)]">
                {ui.title[locale]}
              </p>
              <h1 className="mt-2 font-display text-3xl font-semibold md:text-4xl">
                {view === 'open'
                  ? ui.openAccountTitle[locale]
                  : view === 'reset'
                    ? ui.resetTitle[locale]
                    : ui.signInTitle[locale]}
              </h1>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-xl px-6 pb-16">
          <div className="lounge-rise -mt-9 rounded-3xl bg-white p-7 shadow-[0_14px_44px_rgba(35,40,47,0.08)]">
            {state === 'totp' && ticket ? (
              <>
                <p className="text-[15px] text-[var(--l-soft)]">
                  {ui.totpIntro[locale]}
                </p>
                <form
                  action={totpSignInAction}
                  className="mt-6 flex flex-col gap-4"
                >
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="ticket" value={ticket} />
                  <label>
                    <span className={loungeLabel}>{ui.totpCodeLabel[locale]}</span>
                    <input
                      name="code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]*"
                      maxLength={6}
                      required
                      autoFocus
                      className={`${loungeField} text-center font-display text-2xl tracking-[0.5em]`}
                    />
                  </label>
                  {totpError === 'wrong' ? (
                    <LoungeNote tone="accent">{ui.totpWrong[locale]}</LoungeNote>
                  ) : null}
                  <button type="submit" className={loungePrimary}>
                    {ui.totpSubmit[locale]}
                  </button>
                </form>
              </>
            ) : view === 'open' ? (
              <>
                <p className="text-[15px] text-[var(--l-soft)]">
                  {ui.openAccountIntro[locale]}
                </p>
                <form
                  action={openAccountAction}
                  className="mt-6 flex flex-col gap-4"
                >
                  <input type="hidden" name="locale" value={locale} />
                  <label>
                    <span className={loungeLabel}>
                      {ui.fullNameLabel[locale]}
                    </span>
                    <input
                      type="text"
                      name="name"
                      required
                      autoComplete="name"
                      className={loungeField}
                    />
                  </label>
                  <label>
                    <span className={loungeLabel}>{ui.emailLabel[locale]}</span>
                    <input
                      type="email"
                      name="email"
                      required
                      autoComplete="email"
                      className={loungeField}
                    />
                  </label>
                  <label>
                    <span className={loungeLabel}>
                      {ui.passwordLabel[locale]}
                    </span>
                    <input
                      type="password"
                      name="password"
                      required
                      autoComplete="new-password"
                      className={loungeField}
                    />
                    <span className="mt-1.5 block text-xs text-[var(--l-faint)]">
                      {PASSWORD_POLICY_TEXT[locale]}
                    </span>
                  </label>
                  <button type="submit" className={`${loungePrimary} mt-2`}>
                    {ui.openAccount[locale]}
                  </button>
                </form>
                <p className="mt-5 text-sm">
                  <Link
                    href={`/${locale}/me`}
                    className="text-[var(--l-bronze)] underline underline-offset-4"
                  >
                    {ui.haveAccount[locale]}
                  </Link>
                </p>
              </>
            ) : view === 'reset' ? (
              <>
                <p className="text-[15px] text-[var(--l-soft)]">
                  {ui.resetIntro[locale]}
                </p>
                <form
                  action={requestAccountLinkAction}
                  className="mt-6 flex flex-col gap-4"
                >
                  <input type="hidden" name="locale" value={locale} />
                  <label>
                    <span className={loungeLabel}>{ui.emailLabel[locale]}</span>
                    <input
                      type="email"
                      name="email"
                      required
                      autoComplete="email"
                      className={loungeField}
                    />
                  </label>
                  <button type="submit" className={`${loungePrimary} mt-2`}>
                    {ui.sendLink[locale]}
                  </button>
                </form>
                <p className="mt-5 text-sm">
                  <Link
                    href={`/${locale}/me`}
                    className="text-[var(--l-bronze)] underline underline-offset-4"
                  >
                    {ui.haveAccount[locale]}
                  </Link>
                </p>
              </>
            ) : (
              <>
                <p className="text-[15px] text-[var(--l-soft)]">
                  {ui.signInIntro[locale]}
                </p>
                <form
                  action={signInAction}
                  className="mt-6 flex flex-col gap-4"
                >
                  <input type="hidden" name="locale" value={locale} />
                  <label>
                    <span className={loungeLabel}>{ui.emailLabel[locale]}</span>
                    <input
                      type="email"
                      name="email"
                      required
                      autoComplete="email"
                      className={loungeField}
                    />
                  </label>
                  <label>
                    <span className={loungeLabel}>
                      {ui.passwordLabel[locale]}
                    </span>
                    <input
                      type="password"
                      name="password"
                      required
                      autoComplete="current-password"
                      className={loungeField}
                    />
                  </label>
                  <button type="submit" className={`${loungePrimary} mt-2`}>
                    {ui.signIn[locale]}
                  </button>
                </form>
                <p className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
                  <Link
                    href={`/${locale}/me?view=open`}
                    className="text-[var(--l-bronze)] underline underline-offset-4"
                  >
                    {ui.noAccountYet[locale]}
                  </Link>
                  <Link
                    href={`/${locale}/me?view=reset`}
                    className="text-[var(--l-soft)] underline underline-offset-4 transition-colors hover:text-[var(--l-ink)]"
                  >
                    {ui.forgotPassword[locale]}
                  </Link>
                </p>
              </>
            )}
          </div>

          {state === 'wrong' ? (
            <div className="lounge-rise mt-5 [animation-delay:60ms]">
              <LoungeNote tone="accent">{ui.wrongCredentials[locale]}</LoungeNote>
            </div>
          ) : null}
          {state === 'blocked' ? (
            <div className="lounge-rise mt-5 [animation-delay:60ms]">
              <LoungeNote tone="accent">{ui.accountBlocked[locale]}</LoungeNote>
            </div>
          ) : null}
          {state === 'noPassword' ? (
            <div className="lounge-rise mt-5 [animation-delay:60ms]">
              <LoungeNote tone="accent">{ui.noPasswordYet[locale]}</LoungeNote>
            </div>
          ) : null}
          {state === 'locked' ? (
            <div className="lounge-rise mt-5 [animation-delay:60ms]">
              <LoungeNote tone="accent">{ui.signInLocked[locale]}</LoungeNote>
            </div>
          ) : null}
          {state === 'exists' ? (
            <div className="lounge-rise mt-5 [animation-delay:60ms]">
              <LoungeNote tone="accent">{ui.accountExists[locale]}</LoungeNote>
            </div>
          ) : null}
          {state === 'weakPassword' ? (
            <div className="lounge-rise mt-5 [animation-delay:60ms]">
              <LoungeNote tone="accent">
                {ui.weakPassword[locale]} {PASSWORD_POLICY_TEXT[locale]}
              </LoungeNote>
            </div>
          ) : null}
          {state === 'missing' ? (
            <div className="lounge-rise mt-5 [animation-delay:60ms]">
              <LoungeNote tone="accent">{ui.missingFields[locale]}</LoungeNote>
            </div>
          ) : null}
          {state === 'sent' ? (
            <div className="lounge-rise mt-5 [animation-delay:60ms]">
              <LoungeNote tone="good">{ui.linkSent[locale]}</LoungeNote>
            </div>
          ) : null}
          {state === 'needName' ? (
            <div className="lounge-rise mt-5 [animation-delay:60ms]">
              <LoungeNote tone="accent">{ui.needName[locale]}</LoungeNote>
            </div>
          ) : null}
          {state === 'failed' ? (
            <div className="lounge-rise mt-5 [animation-delay:60ms]">
              <LoungeNote tone="accent">
                {he
                  ? 'הכניסה נכשלה מסיבה טכנית.'
                  : 'Sign-in failed for a technical reason.'}
                {detail ? (
                  <span className="mt-2 block break-all text-xs text-[var(--l-soft)]">
                    {detail}
                  </span>
                ) : null}
              </LoungeNote>
            </div>
          ) : null}
          {link ? (
            <div className="lounge-rise mt-4 rounded-2xl bg-white p-4 text-xs text-[var(--l-soft)] [animation-delay:120ms]">
              {ui.devLink[locale]}{' '}
              <a href={link} className="break-all text-[var(--l-bronze)] underline">
                {link}
              </a>
            </div>
          ) : null}
        </div>
      </main>
    );
  }

  /*
   * The personal home IS the Lounge (the guest registers to the
   * platform once; conferences come and go). The account view appears
   * only on request or when there is something to say — a join
   * conflict, a fresh sign-in link — or nothing to show yet.
   */
  const wantsAccount = view === 'account' || Boolean(state) || Boolean(link);
  const chosen = account.joined.find(
    (conference) => conference.slug === eventParam,
  ) ?? leadConference(account.joined);

  /*
   * The Lounge is always the room (approved: the full Lounge IS the
   * profile, at /me, for everyone). A joined conference lights it with
   * its own life; without one the platform's own light holds the room,
   * and the conferences section carries the invitation.
   */
  if (!wantsAccount) {
    const content = chosen
      ? await getAttendeeExperience(chosen.slug, locale).catch(() => null)
      : null;
    const platformPeople = content
      ? []
      : (await listPlatformParticipants().catch(() => []))
          .filter(
            (person) =>
              person.participantId !== account.id &&
              (!person.email ||
                person.email.toLowerCase() !== account.email.toLowerCase()),
          )
          .slice(0, 3)
          .map((person) => ({
            id: person.participantId,
            name: person.name,
            role:
              [person.roleTitle, person.orgName].filter(Boolean).join(' · ') ||
              undefined,
            reason:
              person.interests ?? (he ? 'חבר/ת הפלטפורמה' : 'On the platform'),
          }));
    /*
     * The bell's truth (platform-wide): requests and unread words from
     * every joined conference, not only the one on screen.
     */
    const allLinks = (
      await Promise.all(
        account.joined
          .slice(0, 5)
          .map((conference) => myConnections(conference.slug).catch(() => [])),
      )
    ).flat();
    const livingLinks = allLinks.filter(
      (connection) => connection.status === 'accepted' || connection.muted,
    );
    const unreadTotal = [
      ...(await myUnreadByConnection(livingLinks)).values(),
    ].reduce((sum, count) => sum + count, 0);
    const links = allLinks;
    /*
     * Link-through, not link-out: the personal Lounge shows the schedule
     * itself. Even before the account-level join, the participant's own
     * activity registrations (the Program's data) fill "My schedule" here —
     * and mark the active conference as one of "My conferences".
     */
    const activeSlug = content
      ? null
      : await getActiveConferenceSlug(locale).catch(() => null);
    const mySchedule = activeSlug
      ? await myActivities(activeSlug, locale).catch(() => null)
      : null;
    const myRegistrations = mySchedule
      ? [...mySchedule.upcoming, ...mySchedule.waiting].sort(
          (a, b) =>
            Date.parse(a.session.startsAt ?? '') -
            Date.parse(b.session.startsAt ?? ''),
        )
      : [];
    const scheduleMoments = myRegistrations.map((a) => ({
      id: a.session.id,
      startTime: formatTimeLabel(a.session.startsAt, locale),
      endTime: formatTimeLabel(a.session.endsAt, locale),
      title: a.session.title,
      description: a.session.description,
      room: a.session.room,
      saved: true,
      kind: (a.session.sessionType === 'break' ? 'break' : 'session') as
        | 'break'
        | 'session',
      dayLabel: formatDayLabel(a.session.startsAt, locale),
      speaker: a.session.speaker,
      sessionType: a.session.sessionType,
    }));
    /*
     * The Lounge no longer sells conferences — it holds the guest's own
     * sessions: the ones they registered for, and the ones they give.
     * Both are read across every conference they belong to, so a speaker
     * sees their talks the moment the organizer lists them.
     */
    const conferenceTitleBySlug = new Map<string, string>();
    for (const conference of [...account.joined, ...account.available]) {
      conferenceTitleBySlug.set(conference.slug, conference.title);
    }
    const sessionSlugs = [
      ...new Set([
        ...account.joined.slice(0, 5).map((conference) => conference.slug),
        ...(activeSlug ? [activeSlug] : []),
      ]),
    ];
    const manyConferences = sessionSlugs.length > 1;
    const toSessionCard = (
      session: SessionSummary,
      slug: string,
      waiting: boolean,
    ) => ({
      at: Date.parse(session.startsAt ?? '') || Number.MAX_SAFE_INTEGER,
      card: {
        id: session.id,
        title: session.title,
        conferenceTitle: manyConferences
          ? conferenceTitleBySlug.get(slug)
          : undefined,
        dayLabel: formatDayLabel(session.startsAt, locale),
        timeLabel: formatTimeLabel(session.startsAt, locale),
        room: session.room,
        sessionType: session.sessionType,
        waiting,
        imageUrl: session.image,
        href: `/${locale}/program?activity=${session.id}`,
      },
    });
    const sessionSets = await Promise.all(
      sessionSlugs.map(async (slug) => {
        const [mine, agenda] = await Promise.all([
          myActivities(slug, locale).catch(() => null),
          listAgenda(slug, locale).catch(() => [] as SessionSummary[]),
        ]);
        return {
          registered: mine
            ? [...mine.upcoming, ...mine.waiting].map((entry) =>
                toSessionCard(
                  entry.session,
                  slug,
                  entry.category === 'waiting',
                ),
              )
            : [],
          presenting: agenda
            .filter((session) =>
              (session.speakers ?? []).some(
                (speaker) => speaker.accountId === account.id,
              ),
            )
            .map((session) => toSessionCard(session, slug, false)),
        };
      }),
    );
    const byTime = (a: { at: number }, b: { at: number }) => a.at - b.at;
    const registeredSessions = sessionSets
      .flatMap((set) => set.registered)
      .sort(byTime)
      .map((entry) => entry.card);
    const presentingSessions = sessionSets
      .flatMap((set) => set.presenting)
      .sort(byTime)
      .map((entry) => entry.card);
    const platformContent = buildPlatformLounge(
      account.name || account.email,
      locale,
      platformPeople,
    );
    if (scheduleMoments.length > 0) {
      platformContent.myDay.moments = scheduleMoments;
    }
    return (
      <LoungeView
        content={content ?? platformContent}
        locale={locale}
        connections={livingLinks.length}
        pending={
          links.filter(
            (connection) =>
              connection.status === 'pending' &&
              connection.direction === 'incoming',
          ).length
        }
        unreadMessages={unreadTotal}
        accountHref={`/${locale}/me?view=account`}
        sessionsSection={{
          registered: registeredSessions,
          presenting: presentingSessions,
          programHref: `/${locale}/program`,
        }}
        homeHref={`/${locale}/me`}
        profileHref={`/${locale}/me/profile`}
      />
    );
  }

  const initial = (account.name || account.email).slice(0, 1).toUpperCase();

  return (
    <main
      id="main-content"
      className="lounge relative min-h-dvh bg-[var(--l-bg)] font-body text-[var(--l-ink)]"
    >
      <div className="relative h-56 md:h-64">
        <Atmosphere />
        <div className="relative mx-auto flex h-full max-w-5xl flex-col px-6 md:px-10">
          <div className="flex items-center justify-between pt-6 text-white/85">
            <Link
              href={`/${locale}`}
              className="text-sm transition-opacity hover:opacity-75"
            >
              ← {he ? 'לדף הבית' : 'Home'}
            </Link>
            <span className="font-display text-sm font-semibold tracking-[0.3em]">
              נטעים
            </span>
          </div>
          <div className="mt-auto flex flex-wrap items-end gap-4 pb-14 text-white">
            <span className="grid size-12 flex-none place-items-center rounded-full bg-white/15 font-display text-lg font-semibold backdrop-blur-sm">
              {initial}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium tracking-[0.18em] text-[var(--l-bronze-soft,#d8b98a)]">
                {ui.greeting[locale]}
              </p>
              <h1 className="mt-1 truncate font-display text-3xl font-semibold md:text-4xl">
                {account.name || account.email}
              </h1>
            </div>
            <div className="ms-auto flex items-center gap-3">
              <Link
                href={`/${locale}/me/profile`}
                className="inline-flex min-h-10 items-center rounded-xl border border-white/25 px-4 text-sm text-white transition-colors hover:border-white/60"
              >
                {ui.profile[locale]}
              </Link>
              <form action={signOutAction}>
                <input type="hidden" name="locale" value={locale} />
                <button
                  type="submit"
                  className="inline-flex min-h-10 items-center text-sm text-white/75 transition-colors hover:text-white"
                >
                  {ui.signOut[locale]}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 pb-20 md:px-10">
        {state === 'conflict' && conflictWith ? (
          <div className="lounge-rise -mt-8 mb-8">
            <LoungeNote tone="accent">
              {ui.conflictPrefix[locale]} <strong>{conflictWith}</strong>.{' '}
              {ui.conflictHint[locale]}
            </LoungeNote>
          </div>
        ) : null}
        {state === 'joinFailed' ? (
          <div className="lounge-rise -mt-8 mb-8">
            <LoungeNote tone="accent">{ui.joinFailed[locale]}</LoungeNote>
          </div>
        ) : null}

        <section className={state ? '' : '-mt-8'}>
          <h2 className="sr-only">{ui.myConferences[locale]}</h2>
          {account.joined.length === 0 ? (
            <div className="lounge-rise">
              <LoungeNote>{ui.noConferences[locale]}</LoungeNote>
            </div>
          ) : (
            <ul className="grid gap-5 md:grid-cols-2">
              {account.joined.map((conference, index) => (
                <li key={conference.slug}>
                  <article
                    className={`lounge-rise flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-[0_14px_44px_rgba(35,40,47,0.08)] ${DELAYS[Math.min(index, 3)]}`}
                  >
                    <span className="relative block h-32 bg-[var(--l-navy)]">
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 bg-cover bg-center opacity-85"
                        style={
                          conference.posterUrl
                            ? { backgroundImage: `url(${conference.posterUrl})` }
                            : undefined
                        }
                      />
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 bg-gradient-to-t from-[rgba(14,27,46,0.55)] to-transparent"
                      />
                      {conference.status ? (
                        <span className="absolute end-4 top-4 inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-[var(--l-bronze)] backdrop-blur-sm">
                          {ACCOUNT_STATUS_LABELS[conference.status]?.[locale] ??
                            conference.status}
                        </span>
                      ) : null}
                    </span>
                    <div className="flex flex-1 flex-col p-5">
                      <span className="block font-display text-lg font-semibold">
                        {conference.title}
                      </span>
                      <span className="mt-0.5 block text-sm text-[var(--l-soft)]">
                        {conference.dateLabel}
                        {conference.location ? ` · ${conference.location}` : ''}
                      </span>
                      <div className="mt-auto flex flex-wrap items-center gap-4 pt-5">
                        <Link
                          href={`/${locale}/events/${conference.slug}/me`}
                          className={loungePrimary}
                        >
                          {ui.openLounge[locale]}
                        </Link>
                        <form action={leaveConferenceAction}>
                          <input type="hidden" name="locale" value={locale} />
                          <input
                            type="hidden"
                            name="slug"
                            value={conference.slug}
                          />
                          <button type="submit" className={loungeGhost}>
                            {ui.leave[locale]}
                          </button>
                        </form>
                      </div>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-12 flex flex-col gap-4">
          <h2 className="font-display text-xl font-semibold">
            {ui.discover[locale]}
          </h2>
          {account.available.length === 0 ? (
            <LoungeNote>{ui.noneAvailable[locale]}</LoungeNote>
          ) : (
            <ul className="grid gap-5 md:grid-cols-2">
              {account.available.map((conference, index) => (
                <li key={conference.slug}>
                  <article
                    className={`lounge-rise flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-[0_14px_44px_rgba(35,40,47,0.08)] ${DELAYS[Math.min(index, 3)]}`}
                  >
                    <span className="relative block h-24 bg-[var(--l-navy)]">
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 bg-cover bg-center opacity-70"
                        style={
                          conference.posterUrl
                            ? { backgroundImage: `url(${conference.posterUrl})` }
                            : undefined
                        }
                      />
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 bg-gradient-to-t from-[rgba(14,27,46,0.55)] to-transparent"
                      />
                    </span>
                    <div className="flex flex-1 flex-col p-5">
                      <span className="block font-display text-lg font-semibold">
                        {conference.title}
                      </span>
                      <span className="mt-0.5 block text-sm text-[var(--l-soft)]">
                        {conference.dateLabel}
                        {conference.location ? ` · ${conference.location}` : ''}
                      </span>
                      {conference.conflictWith ? (
                        <span className="mt-auto block pt-5">
                          <span className="flex flex-col gap-1 rounded-2xl bg-[var(--l-bronze)]/10 px-4 py-3">
                            <span className="text-sm font-medium text-[var(--l-bronze)]">
                              {ui.blocked[locale]} — {ui.conflictPrefix[locale]}{' '}
                              {conference.conflictWith}
                            </span>
                            <span className="text-xs text-[var(--l-soft)]">
                              {ui.conflictHint[locale]}
                            </span>
                          </span>
                        </span>
                      ) : (
                        <form action={joinConferenceAction} className="mt-auto pt-5">
                          <input type="hidden" name="locale" value={locale} />
                          <input
                            type="hidden"
                            name="slug"
                            value={conference.slug}
                          />
                          <button type="submit" className={loungeQuiet}>
                            {ui.join[locale]}
                          </button>
                        </form>
                      )}
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
};

export default AccountPage;
