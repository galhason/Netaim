import Image from 'next/image';
import Link from 'next/link';
import type { Locale } from '@/config/locales';
import { LOUNGE_UI } from '../../constants/lounge-ui';
import type { AttendeeExperienceContent } from '../../types/attendee-experience';

/*
 * The Personal Lounge (the approved reference, precisely): the
 * conference's own light continues past registration. A quiet sidebar,
 * a hero that greets by name and counts down, three generous cards —
 * schedule, networking, updates — the guest's own sessions, and a
 * floating pass. The guest never feels they left the experience.
 */
const DAY_MS = 24 * 60 * 60 * 1000;

export interface LoungeConferenceChip {
  slug: string;
  title: string;
  active: boolean;
  href: string;
}

export interface LoungeSessionCard {
  id: string;
  title: string;
  /* Which conference this session belongs to — the guest may hold several. */
  conferenceTitle?: string;
  dayLabel?: string;
  timeLabel?: string;
  room?: string;
  sessionType?: string;
  waiting: boolean;
  imageUrl?: string;
  /* Opens the Program drawer for this session: full details + leave. */
  href: string;
}

export interface LoungeSessionsSection {
  /* Sessions the guest signed up for, waiting list included. */
  registered: LoungeSessionCard[];
  /* Sessions the guest presents — resolved from the speaker roster. */
  presenting: LoungeSessionCard[];
  programHref?: string;
}

interface LoungeViewProps {
  content: AttendeeExperienceContent;
  locale: Locale;
  connections: number;
  pending: number;
  /* Unread person-to-person messages — joins the messages badge. */
  unreadMessages?: number;
  /* Platform mode: the guest's other conferences, switchable in place. */
  conferences?: LoungeConferenceChip[];
  /* Platform mode: where joining and leaving conferences is managed. */
  accountHref?: string;
  /* The guest's own sessions: the ones attended and the ones presented. */
  sessionsSection?: LoungeSessionsSection;
  /* Platform mode: the personal home and profile live at /me. */
  homeHref?: string;
  profileHref?: string;
}

const TYPE_CHIP: Record<string, string> = {
  workshop: 'bg-[var(--l-bronze)]/15 text-[var(--l-bronze)]',
  keynote: 'bg-[#e8cfa4]/60 text-[#7a5c2e]',
  panel: 'bg-[var(--l-navy)] text-white',
  talk: 'bg-[var(--l-navy)]/10 text-[var(--l-navy)]',
};

const NAV_ICONS = {
  home: 'M4 11.5 12 4l8 7.5M6 10v9h12v-9',
  schedule: 'M4 6.5h16v13H4zM4 10.5h16M8.5 4v4M15.5 4v4',
  networking:
    'M9 8.5a2.7 2.7 0 1 0 0-.01M4.5 19c.5-2.8 2.3-4.4 4.5-4.4s4 1.6 4.5 4.4M15.5 6.5a2.4 2.4 0 1 1 0 4.8M16.5 14c1.8.5 2.9 1.8 3.3 4',
  messages: 'M4 6h16v10H9l-5 3.6zM8 9.5h8M8 12.5h5',
  speakers: 'M12 4a3.2 3.2 0 0 1 3.2 3.2v3.6a3.2 3.2 0 0 1-6.4 0V7.2A3.2 3.2 0 0 1 12 4zM6.5 11a5.5 5.5 0 0 0 11 0M12 16.5V20',
  map: 'M9 4.5 4.5 6.5v13L9 17.5l6 2 4.5-2v-13l-4.5 2zM9 4.5v13M15 6.5v13',
  resources: 'M6 4.5h9l3 3v12H6zM15 4.5v3h3M9 12h6M9 15h4',
  ticket: 'M4 8.5h16v3a1.7 1.7 0 0 0 0 3.4v3.1H4v-3.1a1.7 1.7 0 0 0 0-3.4z',
};

const NavIcon = ({ path }: { path: string }) => (
  <svg
    viewBox="0 0 24 24"
    width="17"
    height="17"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={path} />
  </svg>
);

const SESSION_TYPE_LABEL: Record<string, { he: string; en: string }> = {
  workshop: { he: 'סדנה', en: 'Workshop' },
  keynote: { he: 'הרצאת פתיחה', en: 'Keynote' },
  panel: { he: 'פאנל', en: 'Panel' },
  talk: { he: 'הרצאה', en: 'Talk' },
};

const RISE_DELAY = ['', '[animation-delay:60ms]', '[animation-delay:120ms]'];

/*
 * One session, as the guest owns it: the cover carries the type, the
 * body carries when and where, and the whole tile opens the Program
 * drawer where it can also be left.
 */
const SessionTile = ({
  session,
  locale,
  presenting,
  index,
}: {
  session: LoungeSessionCard;
  locale: Locale;
  presenting: boolean;
  index: number;
}) => {
  const typeLabel = session.sessionType
    ? (SESSION_TYPE_LABEL[session.sessionType]?.[locale] ?? session.sessionType)
    : null;
  const when = [session.dayLabel, session.timeLabel, session.room]
    .filter(Boolean)
    .join(' · ');

  return (
    <li className={`lounge-rise ${RISE_DELAY[index % 3] ?? ''}`}>
      <Link
        href={session.href}
        title={LOUNGE_UI.activityDetailsHint[locale]}
        className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-[0_14px_44px_rgba(35,40,47,0.08)] transition-shadow hover:shadow-[0_18px_54px_rgba(35,40,47,0.14)]"
      >
        <span className="relative block h-20 flex-none bg-[var(--l-navy)]">
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-cover bg-center opacity-80"
            style={
              session.imageUrl
                ? { backgroundImage: `url(${session.imageUrl})` }
                : undefined
            }
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-[rgba(14,27,46,0.6)] to-transparent"
          />
          {typeLabel ? (
            <span className="absolute bottom-3 start-3 inline-flex items-center rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-medium text-[var(--l-navy)] backdrop-blur-sm">
              {typeLabel}
            </span>
          ) : null}
          {presenting ? (
            <span className="absolute end-3 top-3 inline-flex items-center rounded-full bg-[var(--l-bronze)] px-2.5 py-0.5 text-[11px] font-semibold text-white">
              {LOUNGE_UI.sessionsPresenting[locale]}
            </span>
          ) : session.waiting ? (
            <span className="absolute end-3 top-3 inline-flex items-center rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-medium text-[var(--l-navy)] backdrop-blur-sm">
              {LOUNGE_UI.onWaitlist[locale]}
            </span>
          ) : null}
        </span>
        <span className="flex flex-1 flex-col p-4">
          <span className="line-clamp-2 font-display text-[17px] font-semibold leading-snug text-[var(--l-ink)]">
            {session.title}
          </span>
          {when ? (
            <span className="mt-1 block text-xs text-[var(--l-soft)]">{when}</span>
          ) : null}
          {session.conferenceTitle ? (
            <span className="mt-auto flex items-center gap-1.5 pt-3 text-[11px] text-[var(--l-faint)]">
              <span
                aria-hidden="true"
                className="inline-flex h-1.5 w-1.5 flex-none rounded-full bg-[var(--l-bronze)]"
              />
              <span className="truncate">{session.conferenceTitle}</span>
            </span>
          ) : null}
        </span>
      </Link>
    </li>
  );
};

const SessionGroup = ({
  title,
  sessions,
  locale,
  presenting,
}: {
  title: string;
  sessions: LoungeSessionCard[];
  locale: Locale;
  presenting: boolean;
}) => (
  <div>
    <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--l-soft)]">
      {title}
      <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--l-bronze)]/12 px-1.5 text-[11px] font-semibold text-[var(--l-bronze)]">
        {sessions.length}
      </span>
    </p>
    <ul className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {sessions.map((session, index) => (
        <SessionTile
          key={session.id}
          session={session}
          locale={locale}
          presenting={presenting}
          index={index}
        />
      ))}
    </ul>
  </div>
);

const LoungeView = ({
  content,
  locale,
  connections,
  pending,
  unreadMessages,
  conferences,
  accountHref,
  sessionsSection,
  homeHref,
  profileHref,
}: LoungeViewProps) => {
  const platformBase = `/${locale}/me`;
  const base = content.slug ? `/${locale}/events/${content.slug}` : platformBase;
  const home = homeHref ?? `${base}/me`;
  const profile = profileHref ?? `${base}/me/profile`;
  const scheduleHref = `/${locale}/program`;
  const networkingHref = content.slug
    ? `${base}/networking`
    : `${platformBase}/networking`;
  const workshopsHref = `/${locale}/program`;
  const messagesHref = content.slug
    ? `${base}/me/messages`
    : `${platformBase}/messages`;
  const speakersHref = `/${locale}/speakers`;
  const venueHref = content.slug ? `${base}/me/venue` : base;
  const endStamp = Date.parse(content.welcome.endsAt ?? '');
  const ended = !Number.isNaN(endStamp) && endStamp < Date.now();
  const untilStart = Date.parse(content.welcome.countdownTarget) - Date.now();
  const countdown =
    untilStart > 0
      ? {
          days: Math.floor(untilStart / DAY_MS),
          hours: Math.floor((untilStart % DAY_MS) / 3600000),
          minutes: Math.floor((untilStart % 3600000) / 60000),
        }
      : null;
  const workshopMoments = content.myDay.moments.filter(
    (moment) => moment.sessionType === 'workshop',
  );
  const savedWorkshops = workshopMoments.filter(
    (moment) => moment.saved === true,
  );
  /*
   * One primary action per visit (v2.0): the portal answers "what
   * should I do right now?" before anything else.
   */
  const nextAction = !content.slug
    ? {
        title: LOUNGE_UI.actionJoin[locale],
        sub: LOUNGE_UI.actionJoinSub[locale],
        href: '#my-sessions',
        progress: null as { done: number; total: number } | null,
      }
    : workshopMoments.length > 0 && savedWorkshops.length === 0
      ? {
          title: LOUNGE_UI.actionChooseWorkshops[locale],
          sub: LOUNGE_UI.actionChooseWorkshopsSub[locale],
          href: workshopsHref,
          progress: {
            done: savedWorkshops.length,
            total: workshopMoments.length,
          },
        }
      : connections === 0
        ? {
            title: LOUNGE_UI.actionNetworking[locale],
            sub: LOUNGE_UI.actionNetworkingSub[locale],
            href: networkingHref,
            progress: null,
          }
        : {
            title: LOUNGE_UI.actionReady[locale],
            sub: LOUNGE_UI.actionReadySub[locale],
            href: scheduleHref,
            progress: null,
          };
  const initial = (content.welcome.greeting || content.brandName).slice(0, 1);
  const suggestions = content.myDay.moments
    .filter((moment) => moment.kind !== 'break' && moment.saved !== true)
    .slice(0, 3);

  /*
   * The Progress Journey (the approved vision: a path, not a bar):
   * each station lights as the guest walks it.
   */
  const journey = [
    { key: 'account', label: LOUNGE_UI.journeyAccount[locale], done: true },
    {
      key: 'sessions',
      label: LOUNGE_UI.journeyChooseSessions[locale],
      done: content.myDay.moments.some((moment) => moment.saved === true),
    },
    {
      key: 'networking',
      label: LOUNGE_UI.journeyNetworking[locale],
      done: connections > 0,
    },
    {
      key: 'day',
      label: LOUNGE_UI.journeyDay[locale],
      done: !countdown && Boolean(content.slug) && !ended,
    },
    {
      key: 'done',
      label: LOUNGE_UI.journeyDone[locale],
      done: ended,
    },
  ];
  const latestUpdate = content.myEvent.updates[0];

  const sideNav = [
    { key: 'home', label: LOUNGE_UI.myExperience[locale], href: home, active: true },
    { key: 'schedule', label: LOUNGE_UI.schedule[locale], href: scheduleHref },
    { key: 'networking', label: LOUNGE_UI.networking[locale], href: networkingHref, badge: 0 },
    {
      key: 'messages',
      label: LOUNGE_UI.messages[locale],
      href: messagesHref,
      badge: pending + (unreadMessages ?? 0),
    },
    { key: 'speakers', label: LOUNGE_UI.speakers[locale], href: speakersHref },
    { key: 'map', label: LOUNGE_UI.mapVenue[locale], href: venueHref },
    { key: 'resources', label: LOUNGE_UI.resources[locale], href: workshopsHref },
  ];

  return (
    <div className="lounge grid min-h-dvh bg-[var(--l-bg)] font-body text-[var(--l-ink)] lg:grid-cols-[232px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col bg-white/70 p-4 backdrop-blur-sm lg:flex">
        <p className="flex items-center gap-2.5 px-2 py-3">
          <span className="grid size-9 flex-none place-items-center rounded-full bg-[var(--l-bronze)]/15 text-sm font-semibold text-[var(--l-bronze)]">
            {initial}
          </span>
          <span className="font-display text-sm font-semibold leading-tight tracking-wide">
            {content.brandName.toUpperCase()}
          </span>
        </p>
        <nav className="mt-3 flex flex-col gap-1">
          {sideNav.map((item) => (
            <Link
              key={item.key + item.label}
              href={item.href}
              aria-current={item.active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors ${
                item.active
                  ? 'bg-[var(--l-bronze)]/12 font-medium text-[var(--l-ink)]'
                  : 'text-[var(--l-soft)] hover:bg-black/[0.04] hover:text-[var(--l-ink)]'
              }`}
            >
              <NavIcon path={NAV_ICONS[item.key as keyof typeof NAV_ICONS] ?? NAV_ICONS.home} />
              {item.label}
              {item.badge ? (
                <span className="ms-auto grid size-5 place-items-center rounded-full bg-[var(--l-bronze)] text-[10px] font-semibold text-white">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-1">
          <div className="mb-3 rounded-2xl bg-[var(--l-bronze)]/10 p-4">
            <p className="text-sm font-semibold">{LOUNGE_UI.needHelp[locale]}</p>
            <p className="mt-0.5 text-xs text-[var(--l-soft)]">
              {LOUNGE_UI.helpSub[locale]}
            </p>
            <a
              href="mailto:support@hason.events"
              className="mt-3 inline-flex min-h-9 w-full items-center justify-center rounded-xl bg-white text-xs font-medium text-[var(--l-ink)] shadow-[0_6px_18px_rgba(35,40,47,0.08)] transition-colors hover:text-[var(--l-bronze)]"
            >
              {LOUNGE_UI.contactSupport[locale]}
            </a>
          </div>
          <Link
            href={profile}
            className="mb-2 flex items-center gap-3 rounded-2xl border border-[var(--l-hair)] bg-white px-3.5 py-3"
          >
            <span className="grid size-9 flex-none place-items-center rounded-full bg-[var(--l-navy)] text-xs font-semibold text-white">
              {initial}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">
                {content.welcome.greeting}
              </span>
              <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-[var(--l-bronze)]/12 px-2 py-0.5 text-[10px] font-medium text-[var(--l-bronze)]">
                {content.myEvent.statusValue}
              </span>
            </span>
          </Link>
          <span className="flex items-center gap-3 px-3.5 py-2 text-sm text-[var(--l-soft)]">
            <NavIcon path="M12 8.2a2.4 2.4 0 0 1 2.4 2.3c0 1.6-2.4 2-2.4 3.3M12 16.8h.01M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17z" />
            {LOUNGE_UI.helpCenter[locale]}
          </span>
          <Link
            href={base}
            className="flex items-center gap-3 rounded-xl px-3.5 py-2 text-sm text-[var(--l-soft)] transition-colors hover:text-[var(--l-ink)]"
          >
            <NavIcon path="M9 4.5H5.5v15H9M14 12H4.5M11.5 8.5 15 12l-3.5 3.5" />
            {LOUNGE_UI.logOut[locale]}
          </Link>
        </div>
      </aside>

      <div className="min-w-0 pb-28">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[var(--l-navy)]">
            {content.myEvent.image ? (
              <Image
                src={content.myEvent.image.url}
                alt=""
                fill
                priority
                sizes="100vw"
                className="lounge-breathe object-cover opacity-80"
              />
            ) : null}
            <span
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-b from-[rgba(14,27,46,0.6)] via-[rgba(14,27,46,0.3)] to-[var(--l-bg)]"
            />
          </div>
          <div className="relative mx-auto max-w-6xl px-6 pb-44 pt-6 text-white md:px-10">
            <div className="flex items-center gap-3 text-[13px] text-white/85">
              <span className="flex items-center gap-2 font-display text-sm font-semibold tracking-wide">
                <span className="grid size-6 place-items-center rounded-full bg-[var(--l-bronze-soft)]/25 text-[10px] text-[var(--l-bronze-soft)]">✦</span>
                {content.brandName.toUpperCase()}
              </span>
              <span aria-hidden="true" className="h-4 w-px bg-white/30" />
              <span>{content.welcome.eventDateLabel}</span>
              <span aria-hidden="true" className="h-4 w-px bg-white/30" />
              <span>{content.welcome.venueLine}</span>
              <span className="ms-auto flex items-center gap-4">
                <Link
                  href={
                    content.slug
                      ? `/${locale === 'he' ? 'en' : 'he'}/events/${content.slug}/me`
                      : `/${locale === 'he' ? 'en' : 'he'}/me`
                  }
                  className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
                >
                  <NavIcon path="M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17zM3.5 12h17M12 3.5c2.3 2.2 3.5 5.1 3.5 8.5s-1.2 6.3-3.5 8.5c-2.3-2.2-3.5-5.1-3.5-8.5s1.2-6.3 3.5-8.5z" />
                  {locale === 'he' ? 'EN' : 'עב'}
                </Link>
                <span className="relative">
                  <NavIcon path="M12 4.5a5 5 0 0 1 5 5v3l1.5 2.5h-13L7 12.5v-3a5 5 0 0 1 5-5zM10 18a2 2 0 0 0 4 0" />
                  {content.myEvent.updates.length > 0 ? (
                    <span className="absolute -end-0.5 -top-0.5 size-2 rounded-full bg-[var(--l-bronze-soft)]" />
                  ) : null}
                </span>
              </span>
            </div>

            <div className="mt-10 gap-8 md:mt-14 lg:flex lg:items-start lg:justify-between">
              <div className="min-w-0">
              <p className="text-lg text-white/90">
                {LOUNGE_UI.welcomeBack[locale]} {content.welcome.greeting} 👋
              </p>
              <h1 className="lounge-sheen mt-2 font-display text-4xl font-medium tracking-wide md:text-6xl">
                {content.welcome.heading.toUpperCase()}
              </h1>
              <p className="mt-3 max-w-xl text-[15px] text-white/85">
                {content.myEvent.summary || LOUNGE_UI.heroSubline[locale]}
              </p>
              {countdown ? (
                <div className="mt-6 flex items-center gap-3">
                  {[
                    { value: countdown.days, unit: LOUNGE_UI.daysUnit[locale] },
                    { value: countdown.hours, unit: LOUNGE_UI.hoursUnit[locale] },
                    { value: countdown.minutes, unit: LOUNGE_UI.minutesUnit[locale] },
                  ].map((part) => (
                    <span
                      key={part.unit}
                      className="flex min-w-[4.5rem] flex-col items-center rounded-2xl border border-white/25 bg-white/10 px-4 py-3 backdrop-blur-sm"
                    >
                      <span className="font-display text-3xl font-semibold tabular-nums">
                        {part.value}
                      </span>
                      <span className="text-[11px] text-white/70">
                        {part.unit}
                      </span>
                    </span>
                  ))}
                </div>
              ) : null}
              {ended ? (
                <div className="mt-6 inline-flex max-w-xl items-center gap-4 rounded-2xl bg-white/90 px-5 py-3.5 text-[var(--l-ink)] shadow-[0_10px_30px_rgba(14,27,46,0.2)] backdrop-blur-sm">
                  <span className="grid size-9 flex-none place-items-center rounded-full bg-[var(--l-bronze)]/15 text-[var(--l-bronze)]">
                    <NavIcon path="M12 4.5c2.8 0 5 2.2 5 5 0 3.7-5 10-5 10s-5-6.3-5-10c0-2.8 2.2-5 5-5zM12 21h.01M9 9.5l2 2 4-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">
                      {LOUNGE_UI.afterThanks[locale]}
                    </span>
                    <span className="block text-xs text-[var(--l-faint)]">
                      {LOUNGE_UI.afterRecordings[locale]}
                    </span>
                  </span>
                </div>
              ) : null}
              <Link
                href={nextAction.href}
                className="mt-7 inline-flex min-h-12 items-center gap-2.5 rounded-2xl bg-gradient-to-l from-[#8a6a3c] to-[#b08c55] px-7 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(176,140,85,0.35)] transition-transform hover:-translate-y-0.5"
              >
                {LOUNGE_UI.continueJourney[locale]}
                <span aria-hidden="true">←</span>
              </Link>
              </div>

              <aside className="lounge-rise mt-8 w-full flex-none rounded-3xl bg-white/95 p-6 text-[var(--l-ink)] shadow-[0_18px_50px_rgba(14,27,46,0.3)] backdrop-blur-sm lg:mt-0 lg:max-w-sm">
                <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-[var(--l-bronze)]">
                  <NavIcon path="M12 4l1.8 4.4L18 10l-4.2 1.6L12 16l-1.8-4.4L6 10l4.2-1.6z" />
                  {LOUNGE_UI.nextActionTitle[locale].toUpperCase()}
                </p>
                <p className="mt-3 font-display text-2xl font-semibold">
                  {nextAction.title}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--l-soft)]">
                  {nextAction.sub}
                </p>
                {nextAction.progress && nextAction.progress.total > 0 ? (
                  <>
                    <span className="mt-4 block h-1.5 overflow-hidden rounded-full bg-[var(--l-hair)]">
                      <span
                        className="block h-full rounded-full bg-[var(--l-bronze)]"
                        style={{
                          width: `${Math.max(
                            6,
                            Math.round(
                              (nextAction.progress.done /
                                nextAction.progress.total) *
                                100,
                            ),
                          )}%`,
                        }}
                      />
                    </span>
                    <span className="mt-1.5 block text-xs text-[var(--l-faint)]">
                      {LOUNGE_UI.chosenOf[locale]} {nextAction.progress.done}{' '}
                      {LOUNGE_UI.outOf[locale]} {nextAction.progress.total}
                    </span>
                  </>
                ) : null}
                <Link
                  href={nextAction.href}
                  className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--l-navy)] text-sm font-medium text-white transition-colors hover:bg-[#16263c]"
                >
                  {nextAction.title}
                </Link>
              </aside>
            </div>

            {conferences && conferences.length > 1 ? (
              <div className="mt-6 flex flex-wrap items-center gap-2">
                {conferences.map((conference) => (
                  <Link
                    key={conference.slug}
                    href={conference.href}
                    aria-current={conference.active ? 'true' : undefined}
                    className={`inline-flex items-center rounded-full px-4 py-1.5 text-xs backdrop-blur-sm transition-colors ${
                      conference.active
                        ? 'bg-white/90 font-medium text-[var(--l-ink)]'
                        : 'border border-white/30 text-white/85 hover:bg-white/15'
                    }`}
                  >
                    {conference.title}
                  </Link>
                ))}
              </div>
            ) : null}
            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              {accountHref ? (
                <Link
                  href={accountHref}
                  className="inline-flex items-center gap-2 px-1 py-2.5 text-sm text-white/75 transition-colors hover:text-white"
                >
                  {LOUNGE_UI.myAccount[locale]}
                </Link>
              ) : null}
              <Link
                href={profile}
                className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-4 py-2.5 text-sm backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                <NavIcon path="M14.5 5.5 18 9 8.5 18.5H5v-3.5zM12.5 7.5l3.5 3.5" />
                {LOUNGE_UI.editProfile[locale]}
              </Link>
            </div>
          </div>
        </section>

        <div className="relative z-10 mx-auto -mt-32 flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-6 pb-5 text-white md:px-10">
          <ol className="flex flex-wrap items-start gap-0">
            {journey.map((step, index) => (
              <li key={step.key} className="flex items-start">
                {index > 0 ? (
                  <span
                    aria-hidden="true"
                    className={`mt-3.5 h-px w-8 md:w-14 ${
                      step.done ? 'bg-[var(--l-bronze-soft)]' : 'bg-white/25'
                    }`}
                  />
                ) : null}
                <span className="flex w-16 flex-col items-center gap-1.5 text-center md:w-20">
                  <span
                    aria-hidden="true"
                    className={`grid size-7 place-items-center rounded-full text-xs font-bold transition-colors ${
                      step.done
                        ? 'bg-[var(--l-bronze-soft)] text-[var(--l-navy)] shadow-[0_0_18px_rgba(201,169,110,0.45)]'
                        : 'border border-white/40 bg-white/5 text-transparent'
                    }`}
                  >
                    ✓
                  </span>
                  <span
                    className={`text-[11px] leading-tight ${
                      step.done ? 'text-white' : 'text-white/55'
                    }`}
                  >
                    {step.label}
                  </span>
                </span>
              </li>
            ))}
          </ol>
          {latestUpdate && content.slug ? (
            <Link
              href={messagesHref}
              className="group ms-auto flex min-w-0 max-w-full items-center gap-2.5 rounded-full bg-white/12 py-1.5 pe-4 ps-2 text-xs backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              <span className="inline-flex flex-none items-center rounded-full bg-[var(--l-bronze-soft)] px-2.5 py-0.5 text-[10px] font-semibold text-[var(--l-navy)]">
                {LOUNGE_UI.latestUpdate[locale]}
              </span>
              <span className="truncate text-white/90">
                {latestUpdate.title}
              </span>
              <span className="flex-none text-white/60 transition-colors group-hover:text-white">
                {LOUNGE_UI.allUpdates[locale]} ←
              </span>
            </Link>
          ) : null}
        </div>

        <div className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 gap-5 px-6 md:grid-cols-2 md:px-10 xl:grid-cols-3">
          <article className="lounge-rise flex flex-col rounded-3xl bg-white p-5 shadow-[0_14px_44px_rgba(35,40,47,0.08)] [animation-delay:60ms]">
            <h2 className="flex items-center gap-2.5 text-[15px] font-semibold">
              <NavIcon path="M4 6.5h16v13H4zM4 10.5h16M8.5 4v4M15.5 4v4" />
              {LOUNGE_UI.mySchedule[locale]}
              <Link
                href={`${base}/schedule`}
                className="ms-auto text-xs font-normal text-[var(--l-soft)] transition-colors hover:text-[var(--l-bronze)]"
              >
                {LOUNGE_UI.viewFullAgenda[locale]}
              </Link>
            </h2>
            {content.myDay.moments.length === 0 ? (
              <p className="mt-4 flex flex-1 items-center justify-center rounded-2xl border border-dashed border-[var(--l-hair)] px-4 py-6 text-center text-sm text-[var(--l-soft)]">
                {LOUNGE_UI.emptySchedule[locale]}
              </p>
            ) : (
              <span className="mt-3 flex flex-wrap gap-1.5">
                {[...new Set(
                  content.myDay.moments
                    .map((moment) => moment.dayLabel)
                    .filter(Boolean),
                )]
                  .slice(0, 3)
                  .map((day, index) => (
                    <span
                      key={String(day)}
                      className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] ${
                        index === 0
                          ? 'bg-[var(--l-bronze)]/15 font-medium text-[var(--l-bronze)]'
                          : 'border border-[var(--l-hair)] text-[var(--l-soft)]'
                      }`}
                    >
                      {day}
                    </span>
                  ))}
              </span>
            )}
            <ol className="relative mt-4 flex flex-1 flex-col gap-2.5">
              {content.myDay.moments.slice(0, 5).map((moment, index, shown) => (
                <li key={moment.id} className="flex flex-col gap-1.5">
                  {moment.dayLabel &&
                  moment.dayLabel !== shown[index - 1]?.dayLabel ? (
                    <span className="ms-1 mt-1 block text-[10px] font-semibold tracking-[0.14em] text-[var(--l-bronze)]">
                      {moment.dayLabel}
                    </span>
                  ) : null}
                  <span className="flex items-center gap-3">
                    <span className="w-12 flex-none text-xs tabular-nums text-[var(--l-faint)]">
                      {moment.startTime}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`size-2.5 flex-none rounded-full ${
                        index === 0 ? 'bg-[var(--l-bronze)]' : 'bg-[#7C93B4]'
                      }`}
                    />
                    <Link
                      href={`/${locale}/program?activity=${moment.id}`}
                      className="min-w-0 flex-1 rounded-xl border border-[var(--l-hair)] px-3.5 py-2.5 transition-colors hover:border-[var(--l-bronze)] hover:bg-[var(--l-bronze)]/5"
                    >
                      <span className="flex items-center gap-2">
                        <span className="block truncate text-sm font-medium">
                          {moment.title}
                        </span>
                        {moment.saved ? (
                          <span
                            aria-label={content.myDay.savedLabel}
                            className="flex-none text-[var(--l-bronze)]"
                          >
                            <NavIcon path="M7 4.5h10v15l-5-3.5-5 3.5z" />
                          </span>
                        ) : null}
                      </span>
                      {moment.speaker || moment.room ? (
                        <span className="block truncate text-xs text-[var(--l-soft)]">
                          {[moment.speaker, moment.room]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      ) : null}
                    </Link>
                  </span>
                </li>
              ))}
            </ol>
            <Link
              href={scheduleHref}
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--l-hair)] text-sm font-medium transition-colors hover:border-[var(--l-bronze)]"
            >
              {locale === 'he' ? 'נהל את הלו״ז שלי' : 'Manage my schedule'}
            </Link>
          </article>

          <article className="lounge-rise flex flex-col rounded-3xl bg-white p-5 shadow-[0_14px_44px_rgba(35,40,47,0.08)] [animation-delay:120ms]">
            <h2 className="flex items-center gap-2.5 text-[15px] font-semibold">
              <NavIcon path={NAV_ICONS.networking} />
              {LOUNGE_UI.networking[locale]}
              <Link
                href={networkingHref}
                className="ms-auto text-xs font-normal text-[var(--l-soft)] transition-colors hover:text-[var(--l-bronze)]"
              >
                {LOUNGE_UI.seeAll[locale]}
              </Link>
            </h2>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                { value: connections, label: LOUNGE_UI.connections[locale] },
                { value: pending, label: LOUNGE_UI.pending[locale] },
                {
                  value: content.networking.people.length,
                  label: locale === 'he' ? 'מוצעים' : 'Suggested',
                },
              ].map((stat) => (
                <span
                  key={stat.label}
                  className="rounded-2xl border border-[var(--l-hair)] px-2 py-3"
                >
                  <span className="block font-display text-2xl font-semibold">
                    {stat.value}
                  </span>
                  <span className="text-[11px] text-[var(--l-soft)]">
                    {stat.label}
                  </span>
                </span>
              ))}
            </div>
            <p className="mt-4 text-xs font-medium text-[var(--l-soft)]">
              {LOUNGE_UI.peopleToMeet[locale]}
            </p>
            {content.networking.people.length === 0 ? (
              <p className="mt-2 flex flex-1 items-center justify-center rounded-2xl border border-dashed border-[var(--l-hair)] px-4 py-6 text-center text-sm text-[var(--l-soft)]">
                {LOUNGE_UI.emptyNetworking[locale]}
              </p>
            ) : null}
            <ul className="mt-2 flex flex-1 flex-col gap-2">
              {content.networking.people.slice(0, 3).map((person) => (
                <li key={person.id} className="flex items-center gap-3">
                  <span className="grid size-9 flex-none place-items-center overflow-hidden rounded-full bg-[var(--l-bronze)]/15 text-xs font-semibold text-[var(--l-bronze)]">
                    {person.photoUrl ? (
                      <Image
                        src={person.photoUrl}
                        alt={person.photoAlt ?? ''}
                        width={36}
                        height={36}
                        className="size-9 object-cover"
                      />
                    ) : (
                      person.name.slice(0, 1)
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {person.name}
                    </span>
                    <span className="block truncate text-xs text-[var(--l-soft)]">
                      {person.role ?? person.reason}
                    </span>
                  </span>
                  <Link
                    href={networkingHref}
                    className="ms-auto inline-flex min-h-8 flex-none items-center rounded-full bg-[var(--l-bronze)]/12 px-3.5 text-xs font-medium text-[var(--l-bronze)] transition-colors hover:bg-[var(--l-bronze)] hover:text-white"
                  >
                    {LOUNGE_UI.connect[locale]}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href={networkingHref}
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--l-hair)] text-sm font-medium transition-colors hover:border-[var(--l-bronze)]"
            >
              {LOUNGE_UI.findMorePeople[locale]}
            </Link>
          </article>

          <article className="lounge-rise flex flex-col rounded-3xl bg-white p-5 shadow-[0_14px_44px_rgba(35,40,47,0.08)] [animation-delay:180ms]">
            <h2 className="flex items-center gap-2.5 text-[15px] font-semibold">
              <NavIcon path="M12 4.5a5 5 0 0 1 5 5v3l1.5 2.5h-13L7 12.5v-3a5 5 0 0 1 5-5zM10 18a2 2 0 0 0 4 0" />
              {LOUNGE_UI.updates[locale]}
            </h2>
            {content.myEvent.updates.length === 0 ? (
              <p className="mt-4 flex flex-1 items-center justify-center rounded-2xl border border-dashed border-[var(--l-hair)] px-4 py-6 text-center text-sm text-[var(--l-soft)]">
                {LOUNGE_UI.emptyUpdates[locale]}
              </p>
            ) : null}
            <ul className="mt-4 flex flex-1 flex-col gap-3.5">
              {content.myEvent.updates.slice(0, 3).map((update) => (
                <li key={update.id} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-1 size-9 flex-none rounded-xl bg-gradient-to-br from-[#22354D] to-[#0E1B2E]"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{update.title}</span>
                    <span className="block text-xs text-[var(--l-soft)]">
                      {update.text}
                    </span>
                    {update.dateLabel ? (
                      <span className="block text-[10px] text-[var(--l-faint)]">
                        {update.dateLabel}
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
            <Link
              href={messagesHref}
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--l-hair)] text-sm font-medium transition-colors hover:border-[var(--l-bronze)]"
            >
              {LOUNGE_UI.allUpdates[locale]}
            </Link>
          </article>
        </div>

        {sessionsSection ? (
          <section
            id="my-sessions"
            className="mx-auto mt-9 max-w-6xl scroll-mt-24 px-6 md:px-10"
          >
            <h2 className="flex items-center gap-2 text-[15px] font-semibold">
              <NavIcon path={NAV_ICONS.schedule} />
              {LOUNGE_UI.mySessions[locale]}
              {sessionsSection.programHref ? (
                <Link
                  href={sessionsSection.programHref}
                  className="ms-auto text-xs font-normal text-[var(--l-soft)] transition-colors hover:text-[var(--l-bronze)]"
                >
                  {LOUNGE_UI.viewFullProgram[locale]}
                </Link>
              ) : null}
            </h2>

            <div className="mt-4 space-y-7">
              {sessionsSection.registered.length > 0 ? (
                <SessionGroup
                  title={LOUNGE_UI.sessionsRegistered[locale]}
                  sessions={sessionsSection.registered}
                  locale={locale}
                  presenting={false}
                />
              ) : (
                <div className="rounded-2xl bg-[var(--l-bronze)]/10 px-5 py-4">
                  <p className="text-sm text-[var(--l-ink)]">
                    {LOUNGE_UI.noRegisteredSessions[locale]}
                  </p>
                  {sessionsSection.programHref ? (
                    <Link
                      href={sessionsSection.programHref}
                      className="mt-3 inline-flex min-h-10 items-center rounded-xl bg-[var(--l-navy)] px-5 text-sm font-medium text-white transition-colors hover:bg-[#16263c]"
                    >
                      {LOUNGE_UI.browseProgram[locale]}
                    </Link>
                  ) : null}
                </div>
              )}

              {sessionsSection.presenting.length > 0 ? (
                <SessionGroup
                  title={LOUNGE_UI.sessionsPresenting[locale]}
                  sessions={sessionsSection.presenting}
                  locale={locale}
                  presenting
                />
              ) : null}
            </div>
          </section>
        ) : null}

        <div className="mx-auto mt-9 grid max-w-6xl gap-8 px-6 md:px-10">
          {suggestions.length > 0 || content.myEvent.image ? (
            <section className="min-w-0">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold">
                <NavIcon path="M12 4l1.8 4.4L18 10l-4.2 1.6L12 16l-1.8-4.4L6 10l4.2-1.6z" />
                {locale === 'he'
                  ? 'סדנאות ואירועים מומלצים עבורך'
                  : 'Workshops & events picked for you'}
              </h2>
              <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                {suggestions.map((moment) => (
                  <article
                    key={moment.id}
                    className="lounge-rise flex w-44 flex-none flex-col rounded-2xl bg-white p-3.5 shadow-[0_10px_30px_rgba(35,40,47,0.06)]"
                  >
                    <span
                      className={`inline-flex w-fit items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                        TYPE_CHIP[moment.sessionType ?? 'talk'] ?? TYPE_CHIP.talk
                      }`}
                    >
                      {(moment.sessionType ?? 'session').toUpperCase()}
                    </span>
                    <span className="mt-2 line-clamp-2 text-sm font-medium leading-snug">
                      {moment.title}
                    </span>
                    <span className="mt-1 block text-xs text-[var(--l-soft)]">
                      {[moment.dayLabel, moment.startTime]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                    {moment.room ? (
                      <span className="block text-xs text-[var(--l-faint)]">
                        {moment.room}
                      </span>
                    ) : null}
                    <Link
                      href={workshopsHref}
                      className="group mt-auto flex items-center justify-between pt-3 text-xs font-medium text-[var(--l-ink)]"
                    >
                      {locale === 'he' ? 'הוסף ללו״ז' : 'Add to schedule'}
                      <span className="grid size-7 place-items-center rounded-full border border-[var(--l-hair)] text-[var(--l-soft)] transition-colors group-hover:border-[var(--l-bronze)] group-hover:text-[var(--l-bronze)]">
                        <NavIcon path="M12 8v8M8 12h8" />
                      </span>
                    </Link>
                  </article>
                ))}
                {content.myEvent.image ? (
                  <Link
                    href={venueHref}
                    className="lounge-rise group relative block w-44 flex-none self-stretch overflow-hidden rounded-2xl bg-[var(--l-navy)]"
                  >
                    <Image
                      src={content.myEvent.image.url}
                      alt=""
                      fill
                      sizes="176px"
                      className="object-cover opacity-70 transition-transform duration-500 group-hover:scale-105"
                    />
                    <span className="absolute inset-0 bg-gradient-to-t from-[rgba(14,27,46,0.8)] to-transparent" />
                    <span className="absolute inset-x-0 bottom-0 p-3.5 text-white">
                      <span className="block text-sm font-semibold leading-snug">
                        &ldquo;{LOUNGE_UI.waitingForYou[locale]}&rdquo;
                      </span>
                      <span className="mt-0.5 block text-[10px] tracking-[0.14em] text-[var(--l-bronze-soft)]">
                        {content.brandName.toUpperCase()}
                      </span>
                    </span>
                  </Link>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>

        <nav
          aria-label={LOUNGE_UI.myExperience[locale]}
          className="fixed bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-2xl bg-white/95 px-2 py-1.5 shadow-[0_14px_40px_rgba(35,40,47,0.14)] backdrop-blur-sm"
        >
          <Link href={home} className="flex items-center gap-2 rounded-xl bg-[var(--l-bronze)]/12 px-4 py-2 text-sm font-medium text-[var(--l-bronze)]">
            <NavIcon path={NAV_ICONS.home} />
            {LOUNGE_UI.home[locale]}
          </Link>
          <Link href={scheduleHref} className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-[var(--l-soft)] transition-colors hover:text-[var(--l-ink)]">
            <NavIcon path={NAV_ICONS.schedule} />
            {LOUNGE_UI.agenda[locale]}
          </Link>
          <Link href={messagesHref} className="relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-[var(--l-soft)] transition-colors hover:text-[var(--l-ink)]">
            <NavIcon path={NAV_ICONS.messages} />
            {LOUNGE_UI.messages[locale]}
            {pending > 0 ? (
              <span className="grid size-4.5 place-items-center rounded-full bg-[var(--l-bronze)] px-1 text-[10px] font-semibold text-white">
                {pending}
              </span>
            ) : null}
          </Link>
          <Link href={profile} className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-[var(--l-soft)] transition-colors hover:text-[var(--l-ink)]">
            <NavIcon path="M12 5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zM5.5 19c.7-3.3 3.3-5 6.5-5s5.8 1.7 6.5 5" />
            {LOUNGE_UI.profile[locale]}
          </Link>
        </nav>

      </div>
    </div>
  );
};

export default LoungeView;
