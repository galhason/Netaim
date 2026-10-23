import { notFound, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { brandFor } from '@/config/brand';
import { isSupportedLocale, type Locale } from '@/config/locales';
import { ConferenceBar } from '@/features/conference';
import { conferenceBarViewer } from '@/features/conference/services/conference-bar-viewer';
import { JOINED_CONFERENCE_FANOUT, getMyAccount } from '@/features/account';
import type { AccountConference } from '@/features/account';
import {
  LoungeView,
  buildPlatformLounge,
  getAttendeeExperience,
  toAttendeeUpdates,
} from '@/features/attendee';
import { myConnections, myUnreadByConnection } from '@/features/networking';
import { listMyAnnouncements } from '@/features/notifications';
import { listDirectoryParticipants } from '@/infrastructure';
import { getSiteBrand } from '@/features/events';
import { isPlainSession, listAgenda, myActivities } from '@/features/program';
import type { SessionSummary } from '@/features/program';
import { formatDayLabel, formatTimeLabel } from '@/shared';
import SignInScreen from './sign-in-screen';
import { visibleSiteConference } from '@/features/conference/services/conference-door';
import { readReturnPath, returnUrl } from '@/shared/utils/return-path';
import { placeOf } from '@/shared/constants/activity-facets';

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
    link?: string;
    detail?: string;
    view?: string;
    event?: string;
    next?: string;
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
    link: linkParam,
    detail: detailParam,
    view,
    event: eventParam,
    next: nextParam,
  } = await searchParams;
  const returnTo = readReturnPath(nextParam);
  /*
   * The mailed link and the failure detail are shown on the page in
   * development only. In production the address bar is not trusted to
   * put a link on the site's own sign-in screen.
   */
  const development = process.env.NODE_ENV !== 'production';
  const link = development ? linkParam : undefined;
  const detail = development ? detailParam : undefined;
  const account = await getMyAccount(locale);
  /*
   * Someone sent here to sign in who already is goes straight back to
   * the page that asked.
   */
  if (account && returnTo) {
    redirect(returnUrl(returnTo));
  }
  /*
   * Signed in, the personal area is the Lounge and nothing else.
   *
   * The sign-in screen's moments mean nothing to someone already signed
   * in, and there is no separate account page any more: a list of
   * conferences with "cancel registration" under the guest's own, which
   * people reached from addresses like /en/me?state=wrong — a failed
   * attempt before registering, the back button, a bookmark — and read
   * as the platform having lost them. Any of those addresses, and the
   * old ?view=account, go home.
   */
  if (account && (state || ticket || totpError || link || detail || view)) {
    redirect(`/${locale}/me`);
  }
  const siteLogo = await getSiteBrand();
  const barViewer = await conferenceBarViewer();
  const he = locale === 'he';

  if (!account) {
    /*
     * Where someone without an account is sent: the live conference's
     * registration form. Resolved rather than hard-coded, so the link
     * follows whichever conference the Studio has named as live.
     */
    const openSlug = await visibleSiteConference(locale).catch(() => null);
    const registerHref = openSlug
      ? `/${locale}/events/${openSlug}/register`
      : null;
    /*
     * An old link or bookmark to the retired form lands on the real one
     * rather than on a page that quietly does nothing.
     */
    if (view === 'open' && registerHref) {
      redirect(registerHref);
    }
    /*
     * The same screen in the other language, with the moment carried
     * along: a person half-way through the second factor, or reading
     * why the sign-in failed, stays exactly there.
     */
    const other: Locale = locale === 'he' ? 'en' : 'he';
    const carried = new URLSearchParams();
    for (const [key, value] of Object.entries({
      view,
      state,
      ticket,
      totpError,
      link,
      detail,
      next: returnTo ?? undefined,
    })) {
      if (value) carried.set(key, value);
    }
    const query = carried.toString();
    const switchHref = `/${other}/me${query ? `?${query}` : ''}`;

    return (
      <SignInScreen
        locale={locale}
        view={view}
        state={state}
        ticket={ticket}
        totpError={totpError}
        next={returnTo}
        link={link}
        detail={detail}
        registerHref={registerHref}
        switchHref={switchHref}
        brandLogo={siteLogo.onLight}
        bar={
          <ConferenceBar
            locale={locale as Locale}
            slug={openSlug}
            viewer={null}
            brand={brandFor(locale as Locale)}
            brandLogo={siteLogo.onLight}
          />
        }
      />
    );
  }

  /*
   * The personal home IS the Lounge (the guest registers to the
   * platform once; conferences come and go).
   */
  const chosen = account.joined.find(
    (conference) => conference.slug === eventParam,
  ) ?? leadConference(account.joined);

  /*
   * The Lounge is always the room (approved: the full Lounge IS the
   * profile, at /me, for everyone). A joined conference lights it with
   * its own life; without one the platform's own light holds the room,
   * and the conferences section carries the invitation.
   */
  const content = chosen
    ? await getAttendeeExperience(chosen.slug, locale).catch(() => null)
    : null;
  /*
   * The conference is the site, so the directory is the site's own
   * conference — not a list of ones this account happens to hold.
   */
  const directorySlug = await visibleSiteConference(locale).catch(
    () => null,
  );
  const platformPeople =
    content || !directorySlug
      ? []
      : (await listDirectoryParticipants(directorySlug).catch(() => []))
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
        .slice(0, JOINED_CONFERENCE_FANOUT)
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
    : await visibleSiteConference(locale).catch(() => null);
  const mySchedule = activeSlug
    ? await myActivities(activeSlug, locale).catch(() => null)
    : null;
  /*
   * What the conference has actually said. Read here for the same
   * reason the schedule above is: this room is the platform Lounge,
   * which holds no conference of its own, and a guest who registered
   * for activities without joining at the account level still belongs
   * to the live conference's audience.
   */
  const platformUpdates = activeSlug
    ? toAttendeeUpdates(
        await listMyAnnouncements(activeSlug).catch(() => []),
        locale,
      )
    : [];
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
    room: placeOf(a.session) || undefined,
    saved: true,
    kind: (isPlainSession(a.session.sessionType) ? 'break' : 'session') as
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
      ...account.joined.slice(0, JOINED_CONFERENCE_FANOUT).map((conference) => conference.slug),
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
      room: placeOf(session) || undefined,
      sessionType: session.sessionType,
      waiting,
      imageUrl: session.image,
      /*
       * This session's own conference, not whichever one is live. The
       * personal area fans out across every conference the account has
       * joined, so a card from 2027 must lead to 2027's programme.
       */
      href: `/${locale}/events/${slug}/agenda?activity=${session.id}`,
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
            /* Leading it, or sitting on its panel. */
            [...(session.speakers ?? []), ...(session.panelists ?? [])].some(
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
    platformUpdates,
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
      sessionsSection={{
        registered: registeredSessions,
        presenting: presentingSessions,
        programHref: `/${locale}/events/${chosen?.slug ?? activeSlug}/agenda`,
      }}
      homeHref={`/${locale}/me`}
      profileHref={`/${locale}/me/profile`}
      {...(chosen?.slug ?? activeSlug
        ? {
            scheduleHref: `/${locale}/events/${chosen?.slug ?? activeSlug}/my-activities`,
          }
        : {})}
      siteNav={
        <ConferenceBar
          locale={locale as Locale}
          slug={chosen?.slug ?? activeSlug ?? null}
          viewer={barViewer}
          brand={brandFor(locale as Locale)}
          brandLogo={siteLogo.onLight}
        />
      }
    />
  );
};

/*
 * The guest's own session decides what this page shows — the banner and
 * pop-up announcements addressed to them, and their sign-in state. It is
 * rendered per request; a build-time snapshot would freeze both.
 */
export const dynamic = 'force-dynamic';

export default AccountPage;
