import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { isSupportedLocale, type Locale } from '@/config/locales';
import {
  JOINED_CONFERENCE_FANOUT,
  getMyAccount,
} from '@/features/account';
import { LOUNGE_UI } from '@/features/attendee';
import { findPortalEvent, getActiveConferenceSlug } from '@/features/events';
import {
  myConnections,
  myUnreadByConnection,
  type MyConnection,
} from '@/features/networking';
import { getMyDetails } from '@/features/registration';
import {
  listDirectoryParticipants,
  listPublicSpeakers,
  sharedActivityPeers,
  type FellowParticipant,
} from '@/infrastructure';
import {
  manageConnectionAction,
  respondConnectionAction,
} from '../../events/[slug]/networking/actions';
import { platformConnectAction } from './actions';

/*
 * The conference community (Connection Framework v1.0). One hub, three
 * verbs, in the order a person actually needs them: answer whoever is
 * waiting, find the person you just met, discover who is worth meeting.
 * The room is shown as faces, not as a dashboard of numbers; the
 * organizations are a filter, because that is what they really are.
 * Never a giant list; always by consent.
 */
interface NetworkingPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; org?: string; conf?: string; request?: string }>;
}

const card =
  'lounge-rise rounded-3xl bg-white shadow-[0_14px_44px_rgba(35,40,47,0.08)] ring-1 ring-[var(--l-hair)]/70';

const liftable =
  'transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(35,40,47,0.14)]';

const chip =
  'inline-flex items-center rounded-full bg-[var(--l-bronze)]/12 px-2.5 py-1 text-[11px] font-medium text-[var(--l-bronze)]';

const stateChip =
  'inline-flex items-center gap-1.5 rounded-full bg-[var(--l-navy)]/6 px-3 py-1 text-[11px] font-medium text-[var(--l-soft)]';

const connectBtn =
  'inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-[var(--l-bronze)]/50 px-5 text-sm font-medium text-[var(--l-bronze)] transition-colors hover:bg-[var(--l-bronze)]/10';

const railChip =
  'inline-flex min-h-10 flex-none items-center gap-2 rounded-full border px-4 text-xs font-medium transition-colors';

const ghostBtn =
  'min-h-8 text-[11px] text-[var(--l-faint)] underline underline-offset-4 transition-colors hover:text-[var(--l-ink)]';

const splitInterests = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

const listInterests = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const SearchIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className="size-4"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
  >
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </svg>
);

const Avatar = ({
  name,
  photoUrl,
  size = 'md',
}: {
  name: string;
  photoUrl?: string;
  size?: 'sm' | 'md' | 'lg';
}) => {
  const dim =
    size === 'lg' ? 'size-16 text-2xl' : size === 'sm' ? 'size-10 text-sm' : 'size-12 text-lg';
  return photoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- participant portrait from the media API
    <img
      src={photoUrl}
      alt=""
      className={`${dim} flex-none rounded-full object-cover ring-1 ring-[var(--l-bronze)]/40`}
    />
  ) : (
    <span
      className={`${dim} grid flex-none place-items-center rounded-full bg-[var(--l-bronze)]/15 font-display font-semibold text-[var(--l-bronze)]`}
    >
      {name.slice(0, 1)}
    </span>
  );
};

const SectionHead = ({
  he,
  eyebrow,
  title,
  meta,
  action,
}: {
  he: boolean;
  eyebrow: string;
  title: string;
  meta?: string;
  action?: ReactNode;
}) => (
  <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
    <div>
      <p
        className={`text-[11px] font-medium tracking-[0.18em] text-[var(--l-faint)] ${
          he ? '' : 'uppercase'
        }`}
      >
        {eyebrow}
      </p>
      <h2 className="mt-1 font-display text-xl font-semibold md:text-2xl">{title}</h2>
    </div>
    {meta ? (
      <p className="text-xs tabular-nums text-[var(--l-soft)]">{meta}</p>
    ) : null}
    {action}
  </div>
);

const NetworkingPage = async ({ params, searchParams }: NetworkingPageProps) => {
  const { locale } = await params;
  const { q, org, conf, request } = await searchParams;
  if (!isSupportedLocale(locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const account = await getMyAccount(locale);
  if (!account) {
    redirect(`/${locale}/me`);
  }
  const he = locale === 'he';
  const num = (value: number) => value.toLocaleString(he ? 'he-IL' : 'en-GB');

  const chosenConf = account.joined.find((conference) => conference.slug === conf);
  /*
   * The conference is the site itself, so the directory is the site's own
   * conference: the people holding a place in one of its activities who
   * asked to be findable.
   */
  const directorySlug =
    chosenConf?.slug ??
    (await getActiveConferenceSlug(locale as Locale).catch(() => null));
  /*
   * Where to look for this guest's connections: the site's conference,
   * plus any others their account happens to hold.
   */
  const siteConference =
    directorySlug &&
    !account.joined.some((conference) => conference.slug === directorySlug)
      ? await findPortalEvent(directorySlug, locale as Locale).catch(() => null)
      : null;
  const connectionScopes = [
    ...(siteConference
      ? [{ slug: siteConference.slug, title: siteConference.title }]
      : []),
    ...account.joined.slice(0, JOINED_CONFERENCE_FANOUT),
  ];

  const [allPeople, details, speakers, perSlug, peers] = await Promise.all([
    directorySlug
      ? listDirectoryParticipants(directorySlug).catch(() => [])
      : Promise.resolve([] as FellowParticipant[]),
    getMyDetails(),
    listPublicSpeakers().catch(() => []),
    /*
     * Connections are filed against a conference. That is the site's own
     * conference for everyone here, and the fan-out over `account.joined`
     * missed it entirely for a guest who signed up for activities without
     * ever holding an event-level registration — which is most of them.
     */
    Promise.all(
      connectionScopes.map(async (conference) => ({
        conference,
        connections: await myConnections(conference.slug).catch(
          () => [] as MyConnection[],
        ),
      })),
    ),
    /*
     * Who shares a workshop or a talk with this guest. Resolved here
     * because it is about them, and it is what makes a suggestion worth
     * acting on: a name they will recognise from a room they sat in.
     */
    directorySlug
      ? sharedActivityPeers(directorySlug, account.id, locale).catch(() => [])
      : Promise.resolve([]),
  ]);

  const activitiesWith = new Map(
    peers.map((peer) => [peer.participantId, peer.activities]),
  );

  const people = allPeople.filter(
    (person) =>
      person.participantId !== account.id &&
      (!person.email ||
        person.email.toLowerCase() !== account.email.toLowerCase()),
  );

  /* Live connection state, platform-wide */
  const incoming = perSlug.flatMap(({ conference, connections }) =>
    connections
      .filter(
        (connection) =>
          connection.status === 'pending' && connection.direction === 'incoming',
      )
      .map((connection) => ({
        ...connection,
        slug: conference.slug,
        title: conference.title,
      })),
  );
  const acceptedAll = perSlug.flatMap(({ conference, connections }) =>
    connections
      .filter((connection) => connection.status === 'accepted' || connection.muted)
      .map((connection) => ({
        ...connection,
        slug: conference.slug,
        title: conference.title,
      })),
  );
  const unread = await myUnreadByConnection(acceptedAll);
  const unreadTotal = [...unread.values()].reduce((sum, count) => sum + count, 0);
  const activeByOther = new Map<string, 'pending' | 'accepted'>();
  for (const { connections } of perSlug) {
    for (const connection of connections) {
      if (
        connection.status === 'pending' ||
        connection.status === 'accepted' ||
        connection.muted
      ) {
        activeByOther.set(
          connection.otherId,
          connection.status === 'pending' ? 'pending' : 'accepted',
        );
      }
    }
  }

  /*
   * Requests this guest sent that nobody has answered. Only theirs: the
   * receiver's way out of a pending request is to decline it, which is a
   * different act.
   */
  const pendingOutgoing = new Map<string, { id: string; slug: string }>();
  for (const { conference, connections } of perSlug) {
    for (const connection of connections) {
      if (connection.status === 'pending' && connection.direction === 'outgoing') {
        pendingOutgoing.set(connection.otherId, {
          id: connection.id,
          slug: conference.slug,
        });
      }
    }
  }

  /* Organizations: a filter over the room, not a wall of boxes */
  const orgCounts = new Map<string, number>();
  for (const person of people) {
    const name = person.orgName?.trim();
    if (name) {
      orgCounts.set(name, (orgCounts.get(name) ?? 0) + 1);
    }
  }
  const organizations = [...orgCounts.entries()].sort((a, b) => b[1] - a[1]);

  /* Filters compose: a search never drops the organization, and back */
  const linkTo = (next: Partial<Record<'q' | 'org' | 'conf', string | undefined>>) => {
    const merged: Record<string, string | undefined> = { q, org, conf, ...next };
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) {
      if (value) {
        search.set(key, value);
      }
    }
    const suffix = search.toString();
    return `/${locale}/me/networking${suffix ? `?${suffix}` : ''}`;
  };

  const query = (q ?? '').trim().toLowerCase();
  const filtered = people.filter((person) => {
    if (org && (person.orgName ?? '').trim() !== org) {
      return false;
    }
    if (!query) {
      return true;
    }
    return [person.name, person.orgName, person.roleTitle, person.interests]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(query));
  });
  const shown = filtered.slice(0, 24);

  /* Suggestions: shared interests and shared organization, never noise */
  const myInterests = splitInterests(details?.interests);
  const myOrg = (details?.organization ?? '').trim();
  const suggested = people
    .map((person) => {
      const shared = listInterests(person.interests).filter((interest) =>
        myInterests.includes(interest.toLowerCase()),
      );
      const sameOrg = Boolean(myOrg) && (person.orgName ?? '').trim() === myOrg;
      const together = activitiesWith.get(person.participantId) ?? [];
      /*
       * A room you were both in outweighs a matching interest tag and a
       * shared employer together. It is the only one of the three the
       * guest can picture.
       */
      return {
        person,
        shared,
        sameOrg,
        together,
        score: together.length * 5 + shared.length * 2 + (sameOrg ? 1 : 0),
      };
    })
    .filter((entry) => entry.score > 0 && !activeByOther.has(entry.person.participantId))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  /* The room, as faces: portraits first, then everyone else */
  const faces = [...people]
    .sort((a, b) => Number(Boolean(b.photoUrl)) - Number(Boolean(a.photoUrl)))
    .slice(0, 12);

  const requestBanner =
    request === 'sent'
      ? he
        ? 'בקשת ההתחברות נשלחה. תקבלו הודעה כשהיא תאושר.'
        : 'Request sent. We will let you know when it is accepted.'
      : request === 'noShared'
        ? he
          ? 'אין לכם עדיין כנס משותף עם המשתתף הזה, ולכן אי אפשר להתחבר.'
          : 'You have no shared conference with this participant yet, so you cannot connect.'
        : request === 'self'
          ? he
            ? 'זה אתם. נסו להתחבר למישהו אחר.'
            : 'That is you. Try connecting to someone else.'
          : request
            ? he
              ? 'לא הצלחנו לשלוח את הבקשה. נסו שוב מכרטיס המשתתף.'
              : 'We could not send the request. Try again from the participant card.'
            : null;

  const connectForm = (participantId: string, label: string) => (
    <form action={platformConnectAction} className="mt-auto w-full pt-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="participantId" value={participantId} />
      <button type="submit" className={connectBtn}>
        {label}
      </button>
    </form>
  );

  const connectLabel = he ? 'התחברות' : 'Connect';

  const personLine = (person: FellowParticipant) =>
    [person.roleTitle, person.orgName].filter(Boolean).join(' · ');

  const stats = [
    { value: people.length + 1, label: he ? 'משתתפים' : 'Participants' },
    { value: orgCounts.size, label: he ? 'ארגונים' : 'Organizations' },
    { value: speakers.length, label: he ? 'מרצים' : 'Speakers' },
  ];

  return (
    <main
      id="main-content"
      className="lounge min-h-dvh bg-[var(--l-bg)] pb-20 font-body text-[var(--l-ink)]"
    >
      {/* Hero — the room, opened with its faces */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[var(--l-navy)]">
          <span
            aria-hidden="true"
            className="absolute -top-32 left-1/2 h-[26rem] w-[48rem] -translate-x-1/2"
          >
            <span className="lounge-breathe block size-full rounded-full bg-[radial-gradient(closest-side,rgba(201,169,110,0.34),transparent_70%)]" />
          </span>
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-[var(--l-bg)]"
          />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-6 text-white">
          <div className="flex items-center justify-between text-sm text-white/85">
            <Link
              href={`/${locale}/me`}
              className="inline-flex min-h-10 items-center transition-opacity hover:opacity-75"
            >
              ← {LOUNGE_UI.myExperience[locale]}
            </Link>
            <span className="font-display font-semibold tracking-[0.3em]">נטעים</span>
          </div>

          <div className="mt-10 max-w-2xl">
            <p
              className={`text-[11px] font-medium tracking-[0.22em] text-[var(--l-bronze-soft)] ${
                he ? '' : 'uppercase'
              }`}
            >
              {he ? 'הקהילה' : 'The community'}
            </p>
            <h1 className="mt-2 font-display text-[2.1rem] font-semibold leading-[1.06] tracking-tight md:text-5xl">
              {he ? 'קהילת הכנס' : 'The conference community'}
            </h1>
            <p className="mt-3 text-white/70 md:text-lg">
              {he
                ? 'מי נמצא כאן, את מי כדאי לכם להכיר, ומי מחכה לתשובה שלכם.'
                : 'Who is here, who you should meet, and who is waiting on your answer.'}
            </p>
          </div>

          {faces.length > 0 ? (
            <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3">
              <ul aria-hidden="true" className="flex items-center">
                {faces.map((person, index) => (
                  <li
                    key={person.participantId}
                    className="lounge-rise relative -ms-3 first:ms-0"
                    style={{ zIndex: faces.length - index, animationDelay: `${index * 40}ms` }}
                  >
                    {person.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- participant portrait from the media API
                      <img
                        src={person.photoUrl}
                        alt=""
                        className="size-11 rounded-full object-cover ring-2 ring-[var(--l-navy)]"
                      />
                    ) : (
                      <span className="grid size-11 place-items-center rounded-full bg-white/12 font-display text-sm font-semibold text-white ring-2 ring-[var(--l-navy)]">
                        {person.name.slice(0, 1)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-white/70">
                {he
                  ? `${num(people.length + 1)} אנשים בקהילה`
                  : `${num(people.length + 1)} people in the community`}
              </p>
            </div>
          ) : null}

          <dl className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-baseline gap-1.5">
                <dt className="order-2 text-white/55">{stat.label}</dt>
                <dd className="order-1 font-display text-base font-semibold tabular-nums text-white">
                  {num(stat.value)}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="#directory"
              className="inline-flex min-h-11 items-center rounded-xl bg-[var(--l-bronze-soft)] px-5 text-sm font-semibold text-[#1b2436] transition-colors hover:bg-[#d8bb84]"
            >
              {he ? 'לעיון במשתתפים' : 'Browse participants'}
            </Link>
            <Link
              href={`/${locale}/me/profile`}
              className="inline-flex min-h-11 items-center rounded-xl border border-white/25 px-5 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              {he ? 'הפרופיל שלי' : 'My profile'}
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto -mt-12 flex max-w-6xl flex-col gap-10 px-6">
        {requestBanner ? (
          <p
            className={`${card} flex items-center gap-3 p-4 text-sm`}
            role="status"
          >
            <span
              aria-hidden="true"
              className="size-2 flex-none rounded-full bg-[var(--l-bronze)]"
            />
            {requestBanner}
          </p>
        ) : null}

        {/* Waiting on you — the one panel that breaks the white rhythm */}
        {incoming.length > 0 ? (
          <section className="lounge-rise rounded-3xl border border-[var(--l-bronze)]/30 bg-[#f7efe0] p-5 shadow-[0_14px_44px_rgba(35,40,47,0.08)] md:p-6">
            <SectionHead
              he={he}
              eyebrow={he ? 'מחכה לכם' : 'Waiting on you'}
              title={he ? 'בקשות חיבור' : 'Connection requests'}
              meta={
                he
                  ? `${num(incoming.length)} ממתינות`
                  : `${num(incoming.length)} pending`
              }
            />
            <ul className="flex flex-col gap-3">
              {incoming.map((pending) => (
                <li
                  key={pending.id}
                  className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-[var(--l-hair)]"
                >
                  <Avatar name={pending.otherName} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">
                      {pending.otherName}
                    </span>
                    <span className="block text-xs text-[var(--l-faint)]">
                      {pending.title}
                    </span>
                    {pending.message ? (
                      <span className="mt-2 block border-s-2 border-[var(--l-bronze)]/40 ps-3 text-sm text-[var(--l-soft)]">
                        {pending.message}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex flex-none gap-2">
                    {(['accept', 'decline'] as const).map((response) => (
                      <form key={response} action={respondConnectionAction}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="slug" value={pending.slug} />
                        <input type="hidden" name="connectionId" value={pending.id} />
                        <input type="hidden" name="response" value={response} />
                        <button
                          type="submit"
                          className={
                            response === 'accept'
                              ? 'inline-flex min-h-10 items-center rounded-xl bg-[var(--l-navy)] px-5 text-sm font-medium text-white transition-colors hover:bg-[#16263c]'
                              : 'inline-flex min-h-10 items-center rounded-xl border border-[var(--l-hair)] bg-white px-4 text-sm transition-colors hover:border-[var(--l-bronze)]'
                          }
                        >
                          {response === 'accept'
                            ? he
                              ? 'אישור'
                              : 'Accept'
                            : he
                              ? 'דחייה'
                              : 'Decline'}
                        </button>
                      </form>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Find — search, conference, organization, all composing */}
        <section>
          <form
            method="get"
            className={`${card} flex flex-col gap-3 p-3 sm:flex-row sm:items-center`}
          >
            {org ? <input type="hidden" name="org" value={org} /> : null}
            <label className="relative flex-1">
              <span className="sr-only">{he ? 'חיפוש משתתפים' : 'Search participants'}</span>
              <span className="pointer-events-none absolute inset-y-0 start-3.5 flex items-center text-[var(--l-faint)]">
                <SearchIcon />
              </span>
              <input
                type="search"
                name="q"
                defaultValue={q ?? ''}
                placeholder={he ? 'שם, ארגון או תחום עניין' : 'Name, organization or interest'}
                className="min-h-11 w-full rounded-xl border border-[var(--l-hair)] bg-white ps-10 pe-4 text-sm transition-colors focus:border-[var(--l-bronze)] focus:outline-none"
              />
            </label>
            {account.joined.length > 1 ? (
              <label className="flex-none">
                <span className="sr-only">{he ? 'כנס' : 'Conference'}</span>
                <select
                  name="conf"
                  defaultValue={conf ?? ''}
                  className="min-h-11 w-full rounded-xl border border-[var(--l-hair)] bg-white px-3 text-sm sm:w-auto"
                >
                  <option value="">{he ? 'כל הכנסים' : 'All conferences'}</option>
                  {account.joined.map((conference) => (
                    <option key={conference.slug} value={conference.slug}>
                      {conference.title}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <button
              type="submit"
              className="inline-flex min-h-11 flex-none items-center justify-center rounded-xl bg-[var(--l-navy)] px-6 text-sm font-medium text-white transition-colors hover:bg-[#16263c]"
            >
              {he ? 'חיפוש' : 'Search'}
            </button>
          </form>

          {organizations.length > 0 ? (
            <div className="-mx-6 mt-3 flex gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none]">
              <Link
                href={linkTo({ org: undefined })}
                aria-current={org ? undefined : 'true'}
                className={`${railChip} ${
                  org
                    ? 'border-[var(--l-hair)] bg-white text-[var(--l-soft)] hover:border-[var(--l-bronze)]/50'
                    : 'border-[var(--l-bronze)] bg-[var(--l-bronze)]/12 text-[var(--l-bronze)]'
                }`}
              >
                {he ? 'כל הארגונים' : 'All organizations'}
              </Link>
              {organizations.slice(0, 14).map(([name, count]) => {
                const active = org === name;
                return (
                  <Link
                    key={name}
                    href={linkTo({ org: active ? undefined : name })}
                    aria-current={active ? 'true' : undefined}
                    className={`${railChip} ${
                      active
                        ? 'border-[var(--l-bronze)] bg-[var(--l-bronze)]/12 text-[var(--l-bronze)]'
                        : 'border-[var(--l-hair)] bg-white text-[var(--l-soft)] hover:border-[var(--l-bronze)]/50'
                    }`}
                  >
                    {name}
                    <span className="tabular-nums text-[var(--l-faint)]">{num(count)}</span>
                  </Link>
                );
              })}
            </div>
          ) : null}
        </section>

        {/* Discover — the reason is spelled out, not counted */}
        {suggested.length > 0 ? (
          <section>
            <SectionHead
              he={he}
              eyebrow={he ? 'על סמך הפרופיל שלכם' : 'Based on your profile'}
              title={he ? 'אנשים שכדאי להכיר' : 'People worth meeting'}
            />
            <ul className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 xl:grid-cols-4">
              {suggested.map(({ person, shared, sameOrg, together }, index) => (
                <li
                  key={person.participantId}
                  className="w-64 flex-none snap-start md:w-auto"
                >
                  <article
                    className={`${card} ${liftable} flex h-full flex-col items-center gap-2 p-6 text-center`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <Avatar name={person.name} photoUrl={person.photoUrl} size="lg" />
                    <h3 className="font-display text-lg font-semibold">{person.name}</h3>
                    {personLine(person) ? (
                      <p className="text-sm text-[var(--l-soft)]">{personLine(person)}</p>
                    ) : null}
                    {together.length > 0 ? (
                      <p className="mt-1 text-xs font-medium text-[var(--l-bronze)]">
                        {together.length === 1
                          ? he
                            ? `אִתכם ב${together[0]}`
                            : `With you at ${together[0]}`
                          : he
                            ? `אִתכם ב-${num(together.length)} מהפעילויות שלכם`
                            : `With you at ${num(together.length)} of your activities`}
                      </p>
                    ) : null}
                    <p className="mt-1 flex flex-wrap justify-center gap-1.5">
                      {shared.slice(0, 3).map((interest) => (
                        <span key={interest} className={chip}>
                          {interest}
                        </span>
                      ))}
                      {sameOrg ? (
                        <span className={chip}>{he ? 'אותו ארגון' : 'Same organization'}</span>
                      ) : null}
                    </p>
                    {connectForm(person.participantId, connectLabel)}
                  </article>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* The directory */}
        <section id="directory" className="scroll-mt-24">
          <SectionHead
            he={he}
            eyebrow={
              chosenConf
                ? chosenConf.title
                : he
                  ? 'מי שנרשם לפעילויות'
                  : 'Everyone signed up for activities'
            }
            title={he ? 'משתתפים' : 'Participants'}
            meta={
              filtered.length > shown.length
                ? he
                  ? `${num(shown.length)} מתוך ${num(filtered.length)}`
                  : `${num(shown.length)} of ${num(filtered.length)}`
                : `${num(filtered.length)}`
            }
          />
          {shown.length === 0 ? (
            <div className={`${card} flex flex-col items-center gap-3 p-10 text-center`}>
              <p className="font-display text-lg font-semibold">
                {he ? 'אף אחד לא תואם לחיפוש הזה' : 'Nobody matches this search'}
              </p>
              <p className="max-w-sm text-sm text-[var(--l-soft)]">
                {he
                  ? 'נסו שם פרטי, שם ארגון או תחום עניין — או נקו את הסינון וגללו את כל הקהילה.'
                  : 'Try a first name, an organization or an interest — or clear the filters and browse everyone.'}
              </p>
              {q || org ? (
                <Link
                  href={linkTo({ q: undefined, org: undefined })}
                  className="inline-flex min-h-11 items-center rounded-xl border border-[var(--l-hair)] bg-white px-5 text-sm font-medium transition-colors hover:border-[var(--l-bronze)]"
                >
                  {he ? 'ניקוי הסינון' : 'Clear the filters'}
                </Link>
              ) : null}
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {shown.map((person, index) => {
                const state = activeByOther.get(person.participantId);
                const interests = listInterests(person.interests).slice(0, 3);
                return (
                  <li key={person.participantId}>
                    <article
                      className={`${card} ${liftable} flex h-full flex-col p-5`}
                      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                    >
                      <div className="flex items-start gap-4">
                        <Avatar name={person.name} photoUrl={person.photoUrl} />
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-display text-lg font-semibold">
                            {person.name}
                          </h3>
                          {personLine(person) ? (
                            <p className="truncate text-sm text-[var(--l-soft)]">
                              {personLine(person)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      {interests.length > 0 ? (
                        <p className="mt-3 flex flex-wrap gap-1.5">
                          {interests.map((interest) => (
                            <span key={interest} className={chip}>
                              {interest}
                            </span>
                          ))}
                        </p>
                      ) : null}
                      {state === 'accepted' ? (
                        <p className="mt-auto pt-3">
                          <span className={stateChip}>
                            <span
                              aria-hidden="true"
                              className="size-1.5 rounded-full bg-[var(--l-live)]"
                            />
                            {he ? 'מחוברים' : 'Connected'}
                          </span>
                        </p>
                      ) : state === 'pending' ? (
                        <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
                          <span className={stateChip}>
                            {he ? 'ממתין לאישור' : 'Awaiting approval'}
                          </span>
                          {pendingOutgoing.get(person.participantId) ? (
                            <form action={manageConnectionAction}>
                              <input type="hidden" name="locale" value={locale} />
                              <input
                                type="hidden"
                                name="slug"
                                value={
                                  pendingOutgoing.get(person.participantId)?.slug ?? ''
                                }
                              />
                              <input
                                type="hidden"
                                name="connectionId"
                                value={
                                  pendingOutgoing.get(person.participantId)?.id ?? ''
                                }
                              />
                              <input type="hidden" name="manage" value="withdraw" />
                              <button type="submit" className={ghostBtn}>
                                {he ? 'ביטול הבקשה' : 'Cancel request'}
                              </button>
                            </form>
                          ) : null}
                        </div>
                      ) : (
                        connectForm(person.participantId, connectLabel)
                      )}
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Keep — the connections you already made */}
        {connectionScopes.length > 0 ? (
          <section>
            <SectionHead
              he={he}
              eyebrow={he ? 'הקשרים שלי' : 'My connections'}
              title={he ? 'אנשים שאתם מחוברים אליהם' : 'People you are connected to'}
              action={
                <Link
                  href={`/${locale}/me/messages`}
                  className="inline-flex min-h-10 items-center gap-2 text-sm text-[var(--l-bronze)] underline underline-offset-4"
                >
                  {he ? 'כל השיחות' : 'All conversations'}
                  {unreadTotal > 0 ? (
                    <span className="grid min-w-5 place-items-center rounded-full bg-[var(--l-bronze)] px-1.5 text-[11px] font-semibold tabular-nums text-white">
                      {num(unreadTotal)}
                    </span>
                  ) : null}
                </Link>
              }
            />
            {acceptedAll.length === 0 ? (
              <div className={`${card} flex flex-col items-center gap-3 p-10 text-center`}>
                <p className="font-display text-lg font-semibold">
                  {he ? 'עוד לא התחברתם לאף אחד' : 'No connections yet'}
                </p>
                <p className="max-w-sm text-sm text-[var(--l-soft)]">
                  {he
                    ? 'שלחו בקשה למי שמופיע למעלה — הקשר נשמר לכם לכל הכנס.'
                    : 'Send a request to anyone above — the connection stays with you for the whole conference.'}
                </p>
                <Link
                  href="#directory"
                  className="inline-flex min-h-11 items-center rounded-xl bg-[var(--l-navy)] px-5 text-sm font-medium text-white transition-colors hover:bg-[#16263c]"
                >
                  {he ? 'לעיון במשתתפים' : 'Browse participants'}
                </Link>
              </div>
            ) : (
              <ul className="grid gap-4 md:grid-cols-2">
                {acceptedAll.map((connection, index) => (
                  <li key={connection.id}>
                    <article
                      className={`${card} flex h-full flex-col gap-4 p-5`}
                      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar name={connection.otherName} size="sm" />
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-semibold">
                            {connection.otherName}
                          </h3>
                          <p className="truncate text-xs text-[var(--l-faint)]">
                            {connection.title}
                          </p>
                        </div>
                        {connection.muted ? (
                          <span className={stateChip}>{he ? 'מושתק' : 'Muted'}</span>
                        ) : null}
                      </div>

                      <div className="mt-auto flex flex-wrap gap-2">
                        <Link
                          href={`/${locale}/me/chat/${connection.id}`}
                          className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--l-navy)] px-4 text-sm font-medium text-white transition-colors hover:bg-[#16263c]"
                        >
                          {he ? 'הודעה' : 'Message'}
                          {(unread.get(connection.id) ?? 0) > 0 ? (
                            <span className="grid min-w-5 place-items-center rounded-full bg-[var(--l-bronze)] px-1.5 text-[11px] font-semibold tabular-nums text-[#1b2436]">
                              {num(unread.get(connection.id) ?? 0)}
                            </span>
                          ) : null}
                        </Link>
                        <Link
                          href={`/${locale}/events/${connection.slug}/networking`}
                          className="inline-flex min-h-10 items-center rounded-xl border border-[var(--l-hair)] px-4 text-sm font-medium transition-colors hover:border-[var(--l-bronze)]"
                        >
                          {he ? 'ערוצי קשר' : 'Contact channels'}
                        </Link>
                      </div>

                      <div className="flex items-center gap-5 border-t border-[var(--l-hair)] pt-3">
                        <form action={manageConnectionAction}>
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="slug" value={connection.slug} />
                          <input type="hidden" name="connectionId" value={connection.id} />
                          <input
                            type="hidden"
                            name="manage"
                            value={connection.muted ? 'unmute' : 'mute'}
                          />
                          <button type="submit" className={ghostBtn}>
                            {connection.muted
                              ? he
                                ? 'ביטול השתקה'
                                : 'Unmute'
                              : he
                                ? 'השתקה'
                                : 'Mute'}
                          </button>
                        </form>
                        <form action={manageConnectionAction}>
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="slug" value={connection.slug} />
                          <input type="hidden" name="connectionId" value={connection.id} />
                          <input type="hidden" name="manage" value="remove" />
                          <button type="submit" className={ghostBtn}>
                            {he ? 'הסרת הקשר' : 'Remove'}
                          </button>
                        </form>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : (
          <div className={`${card} flex flex-col items-center gap-3 p-10 text-center`}>
            <p className="font-display text-lg font-semibold">
              {he ? 'הקהילה מתחילה בפעילות' : 'The community starts at an activity'}
            </p>
            <p className="max-w-sm text-sm text-[var(--l-soft)]">
              {he
                ? 'הירשמו לסדנה או להרצאה, ומכאן תכירו את מי שיושב אתכם באותו חדר.'
                : 'Sign up for a workshop or a talk, and meet the people in the room with you.'}
            </p>
            <Link
              href={`/${locale}/program`}
              className="inline-flex min-h-11 items-center rounded-xl bg-[var(--l-navy)] px-5 text-sm font-medium text-white transition-colors hover:bg-[#16263c]"
            >
              {LOUNGE_UI.myExperience[locale]}
            </Link>
          </div>
        )}
      </div>
    </main>
  );
};

/*
 * The response depends on who is asking, so it is rendered per request
 * and never prerendered or shared. Declared rather than left to Next to
 * infer from a cookie read: an inferred guard disappears the moment a
 * refactor moves that read behind a helper, and the failure would be a
 * privacy leak that nothing announces.
 */
export const dynamic = 'force-dynamic';

export default NetworkingPage;
