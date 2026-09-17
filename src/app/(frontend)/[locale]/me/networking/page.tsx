import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { brandFor } from '@/config/brand';
import { isSupportedLocale, type Locale } from '@/config/locales';
import { CinematicNav } from '@/features/cinematic';
import {
  JOINED_CONFERENCE_FANOUT,
  getMyAccount,
} from '@/features/account';
import { LOUNGE_UI } from '@/features/attendee';
import {
  findPortalEvent,
  getActiveConferenceSlug,
  getSiteBrand,
} from '@/features/events';
import {
  connectionChannels,
  myBlockedPeople,
  myConnections,
  myHiddenParticipantIds,
  myMeetings,
  myUnreadByConnection,
  type ConnectionChannels,
  type MyConnection,
  type MyMeeting,
} from '@/features/networking';
import { getMyDetails, myContactPreferences } from '@/features/registration';
import {
  listDirectoryParticipants,
  sharedActivityPeers,
  type FellowParticipant,
} from '@/infrastructure';
import NetworkingHero from './ui/hero';
import PeopleBubbles, { type Bubble } from './ui/bubbles';
import RecommendedPeople from './ui/recommended';
import IncomingRequests from './ui/incoming';
import NetworkingSearch from './ui/search';
import ParticipantDirectory from './ui/directory';
import ConnectionsSection from './ui/connections';
import MeetingsSection from './ui/meetings';
import BlockedSection from './ui/blocked';
import MobileNav from './ui/mobile-nav';
import { card, personLine, type ReasonTone } from './ui/shared';

/*
 * The conference community — a small social network built around the
 * conference (Connection Framework v1.0).
 *
 * The order answers a person\u2019s actual questions, most urgent first:
 * who is waiting on me, who should I meet, who is here at all — then
 * what I already have (connections, meetings) and, folded away last,
 * whom I removed. Discovery and decision are deliberately two places:
 * the bubbles up top invite a glance and jump, the directory below
 * carries the commitment.
 *
 * Everything on this page works without JavaScript: search and filters
 * are GET forms over the same query parameters as always, every act is
 * a POST server action, and navigation between sections is anchors.
 * The social feel comes from composition, color-as-meaning and motion
 * that respects prefers-reduced-motion — never from client state.
 */
interface NetworkingPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    q?: string;
    org?: string;
    conf?: string;
    open?: string;
    count?: string;
    request?: string;
    meeting?: string;
  }>;
}

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

const NetworkingPage = async ({ params, searchParams }: NetworkingPageProps) => {
  const { locale } = await params;
  const {
    q,
    org,
    conf,
    open,
    count,
    request,
    meeting: meetingState,
  } = await searchParams;
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
  const siteLogo = await getSiteBrand();
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

  const [allPeople, details, myPrefs, perSlug, peers] = await Promise.all([
    directorySlug
      ? listDirectoryParticipants(directorySlug).catch(() => [])
      : Promise.resolve([] as FellowParticipant[]),
    getMyDetails(),
    myContactPreferences().catch(() => null),
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

  /*
   * Blocking removes a person from the room, in both directions — the
   * one who blocked never meets them again, and the blocked account
   * cannot arrive through the directory, the suggestions or the faces.
   */
  const [hiddenIds, blockedPeople] = await Promise.all([
    myHiddenParticipantIds(),
    myBlockedPeople(),
  ]);

  const people = allPeople.filter(
    (person) =>
      person.participantId !== account.id &&
      !hiddenIds.has(person.participantId) &&
      (!person.email ||
        person.email.toLowerCase() !== account.email.toLowerCase()),
  );
  /*
   * The same consent-filtered directory listing, keyed by person, so a
   * connection tile can borrow the photo and headline its owner already
   * shows the room. Someone who left the directory simply isn't here,
   * and their tile stays name-only — no new data, no new exposure.
   */
  const fellowById = new Map(
    people.map((person) => [person.participantId, person]),
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

  /*
   * The channels, and the meetings.
   *
   * Both used to live on the conference's own networking page, which
   * meant a guest looking at a connection here was sent somewhere else
   * to phone them — and meetings had no address on the platform hub at
   * all. They are read beside the connections that make them possible.
   *
   * Channels are resolved per connection rather than per person: what
   * opens is the other side's decision, and it is theirs to change at
   * any moment, so it is asked fresh and never cached beside a name.
   */
  const [channelPairs, meetingLists] = await Promise.all([
    Promise.all(
      acceptedAll.map(async (connection) => {
        const channels = await connectionChannels(connection.id).catch(
          () => null,
        );
        return [connection.id, channels] as const;
      }),
    ),
    Promise.all(
      connectionScopes.map(async (conference) => ({
        conference,
        meetings: await myMeetings(conference.slug).catch(
          () => [] as MyMeeting[],
        ),
      })),
    ),
  ]);
  const channelsById = new Map<string, ConnectionChannels | null>(channelPairs);
  const meetings = meetingLists
    .flatMap(({ conference, meetings: list }) =>
      list.map((meeting) => ({ ...meeting, slug: conference.slug })),
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
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
  const linkTo = (
    next: Partial<Record<'q' | 'org' | 'conf' | 'open', string | undefined>>,
  ) => {
    const merged: Record<string, string | undefined> = {
      q,
      org,
      conf,
      open,
      ...next,
    };
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
    /* The green chip: only people whose door to meetings is open. */
    if (open && !person.openToMeetings) {
      return false;
    }
    if (!query) {
      return true;
    }
    return [person.name, person.orgName, person.roleTitle, person.interests]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(query));
  });
  /*
   * The explorer's order and its window.
   *
   * Browsing (no search) walks a shuffled order so refreshing the page
   * surfaces different people — but shuffled ONCE per viewer per day,
   * with a seed derived from who is looking and today's date. The same
   * seed holds across every "load more", so the list only ever extends
   * and no face can appear twice. A search is a question with a right
   * answer, so its results stay in the stable alphabetical order.
   *
   * The window itself is the ?count parameter: twelve people, then
   * twelve more each press, capped to what actually exists. Any change
   * of search or filter drops ?count and starts the window over.
   */
  const PAGE_SIZE = 12;
  const seedOf = (text: string): number => {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
    }
    return hash >>> 0;
  };
  const shuffled = (list: FellowParticipant[], seed: number) => {
    let state = seed || 1;
    const random = () => {
      state = Math.imul(state ^ (state >>> 15), state | 1) >>> 0;
      state ^= state + Math.imul(state ^ (state >>> 7), state | 61);
      return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
    };
    const out = [...list];
    for (let index = out.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(random() * (index + 1));
      const held = out[index]!;
      out[index] = out[swap]!;
      out[swap] = held;
    }
    return out;
  };
  const today = new Date().toISOString().slice(0, 10);
  const ordered = query
    ? filtered
    : shuffled(filtered, seedOf(`${account.id}:${today}`));

  const parsedCount = Number(count);
  const visibleCount = Math.min(
    Number.isFinite(parsedCount) && parsedCount > PAGE_SIZE
      ? Math.floor(parsedCount)
      : PAGE_SIZE,
    filtered.length,
  );
  const shown = ordered.slice(0, visibleCount);
  /*
   * The door to more: the same URL with every live parameter and a
   * grown count, anchored so a browser without JavaScript lands back
   * at the directory it just extended.
   */
  const base = linkTo({});
  const loadMoreHref =
    filtered.length > visibleCount
      ? `${base}${base.includes('?') ? '&' : '?'}count=${Math.min(
          visibleCount + PAGE_SIZE,
          filtered.length,
        )}#directory`
      : null;

  /* Suggestions: shared interests and shared organization, never noise */
  const myInterests = splitInterests(details?.interests);
  const myOrg = (details?.organization ?? '').trim();
  const scoredAll = people
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
    .sort((a, b) => b.score - a.score);
  const suggested = scoredAll.slice(0, 4);

  const BANNERS: Record<string, { he: string; en: string }> = {
    sent: {
      he: 'בקשת ההתחברות נשלחה. תקבלו הודעה כשהיא תאושר.',
      en: 'Request sent. We will let you know when it is accepted.',
    },
    noShared: {
      he: 'אין לכם עדיין כנס משותף עם המשתתף הזה, ולכן אי אפשר להתחבר.',
      en: 'You have no shared conference with this participant yet, so you cannot connect.',
    },
    self: {
      he: 'זה אתם. נסו להתחבר למישהו אחר.',
      en: 'That is you. Try connecting to someone else.',
    },
    blocked: {
      he: 'המשתתף נחסם. הוא לא יופיע לכם יותר ולא יוכל ליצור אתכם קשר.',
      en: 'Blocked. They will not appear to you again and cannot reach you.',
    },
    unblocked: {
      he: 'החסימה בוטלה.',
      en: 'The block was lifted.',
    },
    'report-sent': {
      he: 'הדיווח נשלח לצוות הכנס. תודה — נטפל בזה.',
      en: 'Your report reached the conference team. Thank you — we will look into it.',
    },
    'report-invalid': {
      he: 'לא ניתן לדווח על המשתתף הזה.',
      en: 'That participant cannot be reported.',
    },
  };

  /*
   * What just happened to a meeting, said in words. A refusal is the
   * interesting case: the service turns down a proposal to someone who
   * closed meetings or is no longer connected, and a form that silently
   * did nothing would read as a broken button.
   */
  const MEETING_BANNERS: Record<string, Record<Locale, string>> = {
    proposed: {
      he: 'ההצעה נשלחה. היא תופיע כמאושרת ברגע שהצד השני יאשר.',
      en: 'The proposal was sent. It becomes confirmed once the other side agrees.',
    },
    refused: {
      he: 'לא ניתן לקבוע את הפגישה — ייתכן שהצד השני סגר קבלת פגישות או שהקשר הוסר.',
      en: 'The meeting could not be arranged — the other side may have closed meetings, or the connection ended.',
    },
    conflict: {
      he: 'הפגישה מתנגשת עם פגישה מאושרת אחרת.',
      en: 'This meeting clashes with another confirmed meeting.',
    },
  };
  const meetingBanner = meetingState
    ? (MEETING_BANNERS[meetingState]?.[locale] ?? null)
    : null;

  const requestBanner = request
    ? (BANNERS[request]?.[locale] ??
      (he
        ? 'לא הצלחנו לבצע את הפעולה. נסו שוב מכרטיס המשתתף.'
        : 'We could not complete that. Try again from the participant card.'))
    : null;

  /*
   * Why each face is on the screen, in words and in a ring color. The
   * reason is always the real one — a room you shared outranks an
   * interest tag outranks an employer, exactly like the score that
   * ordered them — and never a percentage the platform cannot defend.
   */
  const reasonOf = (entry: (typeof scoredAll)[number]): {
    reason: string;
    tone: ReasonTone;
  } =>
    entry.together.length > 0
      ? {
          reason: he
            ? `אִתכם ב${entry.together[0]}`
            : `With you at ${entry.together[0]}`,
          tone: 'gold',
        }
      : entry.shared.length > 0
        ? {
            reason: he
              ? `תחום משותף: ${entry.shared[0]}`
              : `Shared: ${entry.shared[0]}`,
            tone: 'blue',
          }
        : {
            reason: he ? 'אותו ארגון' : 'Same organization',
            tone: 'pink',
          };

  const bubbles: Bubble[] = scoredAll.slice(0, 12).map((entry) => ({
    person: entry.person,
    ...reasonOf(entry),
  }));
  /*
   * A young community has few scored matches, and eight empty slots
   * would make the room look abandoned — worst of all in a tiny test
   * room where the guest already knows everyone, which once emptied
   * this rail completely and collapsed the whole discovery layer. So
   * the rail fills in honesty order: strangers who opened their door
   * (green), strangers plainly here (purple), and finally the people
   * you already reached — a connection ("כבר מחוברים") or a request in
   * flight. The rail shows the room as it is; the reason under each
   * face never pretends otherwise.
   */
  const taken = new Set(bubbles.map((bubble) => bubble.person.participantId));
  const spare = people.filter(
    (person) =>
      !taken.has(person.participantId) &&
      !activeByOther.has(person.participantId),
  );
  for (const person of spare.filter((entry) => entry.openToMeetings)) {
    if (bubbles.length >= 12) break;
    taken.add(person.participantId);
    bubbles.push({
      person,
      reason: he ? 'פתוח/ה לפגישות' : 'Open to meetings',
      tone: 'green',
    });
  }
  for (const person of spare) {
    if (bubbles.length >= 12) break;
    if (taken.has(person.participantId)) continue;
    taken.add(person.participantId);
    bubbles.push({
      person,
      reason: personLine(person) || (he ? 'משתתפ/ת בכנס' : 'At the conference'),
      tone: 'purple',
    });
  }
  /*
   * Pending is two different sentences depending on who is waiting.
   * A request THEY sent deserves the warmer word and the warmer ring —
   * it is the single most actionable face on the rail.
   */
  const waitingOnMe = new Set(incoming.map((pending) => pending.otherId));
  for (const person of people) {
    if (bubbles.length >= 12) break;
    if (taken.has(person.participantId)) continue;
    const state = activeByOther.get(person.participantId);
    if (!state) continue;
    taken.add(person.participantId);
    const reason =
      state === 'accepted'
        ? he
          ? 'כבר חברים'
          : 'Connected'
        : waitingOnMe.has(person.participantId)
          ? he
            ? 'מחכה לתשובתכם'
            : 'Waiting for you'
          : he
            ? 'שלחתם בקשה'
            : 'Request sent';
    bubbles.push({
      person,
      reason,
      tone:
        state === 'accepted'
          ? 'green'
          : waitingOnMe.has(person.participantId)
            ? 'gold'
            : 'purple',
    });
  }

  const recommendations = suggested.map((entry) => ({
    person: entry.person,
    ...reasonOf(entry),
  }));

  const openCount = people.filter((person) => person.openToMeetings).length;
  /* The hero's little crowd: portraits first, five faces at most. */
  const faces = [...people]
    .sort((a, b) => Number(Boolean(b.photoUrl)) - Number(Boolean(a.photoUrl)))
    .slice(0, 5);
  const now = Date.now();
  const nextMeeting =
    meetings.find(
      (meeting) =>
        meeting.status !== 'cancelled' && Date.parse(meeting.startsAt) > now,
    ) ?? null;

  const myself = {
    name: details?.name ?? account.email,
    photoUrl: details?.photoUrl,
    line:
      details?.headline ??
      [details?.role, details?.organization].filter(Boolean).join(' · '),
    open: myPrefs?.prefs.meetings !== false,
    connections: acceptedAll.length,
    meetings: meetings.filter((meeting) => meeting.status !== 'cancelled')
      .length,
  };

  return (
    <main
      id="main-content"
      className="community lounge min-h-dvh bg-[var(--n-bg)] pb-28 font-body text-[var(--n-ink)] md:pb-16"
    >
      {/*
        * The site's own navigation — the same CinematicNav every other
        * page wears, tokens scoped by the `cinematic` class. Two local
        * overrides, both visual: the fixed grain overlay stays off this
        * warm page, and the bar keeps its glass surface from the first
        * pixel, because here it floats over cream, not over a dark hero.
        */}
      <div className="cinematic bg-transparent [&::after]:content-none [&>header]:border-b [&>header]:border-white/10 [&>header]:bg-[var(--nt-dark-deep)]/90 [&>header]:backdrop-blur-md">
        <CinematicNav
          locale={locale as Locale}
          registerHref={`/${locale}`}
          meHref={`/${locale}/me`}
          brand={brandFor(locale as Locale)}
          brandLogo={siteLogo.onDark}
          {...(directorySlug
            ? { scheduleHref: `/${locale}/events/${directorySlug}/my-activities` }
            : {})}
          viewer={{ name: myself.name }}
          immediate
        />
      </div>
      <NetworkingHero
        locale={locale as Locale}
        he={he}
        num={num}
        participantCount={people.length + 1}
        openCount={openCount}
        faces={faces}
        myself={myself}
        nextMeeting={nextMeeting}
      />

      {/*
        * The narrative, in order: DISCOVER (the bubbles, straight after
        * the hero) → CONNECT (whoever is waiting, then the recommended)
        * → SEARCH → EXPLORE (the directory) → MANAGE (connections,
        * meetings, blocked). Search deliberately comes after the
        * social layer: the first question this page answers is "who
        * should I meet", never "who can I look up".
        */}
      <div className="mx-auto mt-5 flex max-w-6xl flex-col gap-7 px-4 md:mt-6 md:gap-8 md:px-6">
        {requestBanner ? (
          <p
            className={`${card} flex items-center gap-3 p-4 text-sm`}
            role="status"
          >
            <span
              aria-hidden="true"
              className="size-2 flex-none rounded-full bg-[var(--n-gold)]"
            />
            {requestBanner}
          </p>
        ) : null}

        <PeopleBubbles he={he} bubbles={bubbles} />

        <IncomingRequests
          locale={locale as Locale}
          he={he}
          num={num}
          incoming={incoming}
        />

        <RecommendedPeople
          locale={locale as Locale}
          he={he}
          recommendations={recommendations}
          directorySlug={directorySlug ?? ''}
        />

        <NetworkingSearch
          he={he}
          basePath={`/${locale}/me/networking`}
          num={num}
          q={q}
          org={org}
          conf={conf}
          open={open}
          joined={account.joined}
          organizations={organizations}
          linkTo={linkTo}
        />

        <ParticipantDirectory
          locale={locale as Locale}
          he={he}
          num={num}
          q={q}
          org={org}
          isFiltered={Boolean(query || org || open)}
          totalCount={people.length}
          filteredCount={filtered.length}
          shown={shown}
          loadMoreHref={loadMoreHref}
          remaining={filtered.length - visibleCount}
          directorySlug={directorySlug ?? ''}
          activeByOther={activeByOther}
          pendingOutgoing={pendingOutgoing}
          clearHref={linkTo({ q: undefined, org: undefined, open: undefined })}
        />

        {connectionScopes.length > 0 ? (
          <section>
            <ConnectionsSection
              locale={locale as Locale}
              he={he}
              num={num}
              connections={acceptedAll}
              unread={unread}
              channelsById={channelsById}
              fellowById={fellowById}
              directorySlug={directorySlug ?? ''}
            />
            <MeetingsSection
              locale={locale as Locale}
              he={he}
              accepted={acceptedAll}
              meetings={meetings}
              fellowById={fellowById}
              banner={meetingBanner}
            />
          </section>
        ) : (
          <div
            className={`${card} flex flex-col items-center gap-3 p-10 text-center`}
          >
            <p className="font-display text-lg font-semibold">
              {he
                ? 'הקהילה מתחילה בפעילות'
                : 'The community starts at an activity'}
            </p>
            <p className="max-w-sm text-sm text-[var(--n-soft)]">
              {he
                ? 'הירשמו לסדנה או להרצאה, ומכאן תכירו את מי שיושב אתכם באותו חדר.'
                : 'Sign up for a workshop or a talk, and meet the people in the room with you.'}
            </p>
            <Link
              href={`/${locale}/program`}
              className="inline-flex min-h-11 items-center rounded-full bg-[var(--n-navy)] px-5 text-sm font-medium text-white transition-colors hover:bg-[var(--n-deep)]"
            >
              {LOUNGE_UI.myExperience[locale as Locale]}
            </Link>
          </div>
        )}

        <BlockedSection
          locale={locale as Locale}
          he={he}
          num={num}
          blockedPeople={blockedPeople}
        />
      </div>

      <MobileNav
        locale={locale as Locale}
        he={he}
        unreadTotal={unreadTotal}
        num={num}
      />
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
