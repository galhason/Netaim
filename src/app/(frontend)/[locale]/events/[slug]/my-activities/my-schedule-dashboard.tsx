'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { Locale } from '@/config/locales';
import {
  ActivityCard,
  ActivityDrawer,
  DayTabs,
  EmptyState,
  IconArrow,
  IconCalendar,
  ToastProvider,
  useFavorites,
  type ActivityVM,
  type DayVM,
  type MyRegistrationsVM,
} from '@/features/conference';
import { registerActivityAction, leaveActivityAction } from './actions';
import NextActivityCard from './next-activity-card';
import NotificationBar from './notification-bar';
import ScheduleHero, { type HeroStateVM } from './schedule-hero';
import {
  ConferenceCalendar,
  Discovery,
  ExportCard,
  FreeTime,
  KpiRow,
  MySpeakers,
  NoticeBoard,
  type BoardNoticeVM,
  type GapSuggestion,
  type KpiVM,
  type MySpeakerRowVM,
} from './dashboard-widgets';

interface Props {
  locale: Locale;
  slug: string;
  eventTitle: string;
  activities: ActivityVM[];
  days: DayVM[];
  mine: MyRegistrationsVM;
  todayKey: string;
  notice: string | null;
  venue?: string;
  initialActivityId?: string | null;
}

type Segment = 'all' | 'today' | 'upcoming' | 'done' | 'cancelled';

const MIN = 60000;
const HOUR = 3600000;
const GAP_MIN = 45;
const SOON_MIN = 60;

const COPY = {
  title: { he: 'היום שלי בכנס', en: 'My day at the conference' },
  sub: {
    he: 'כל הפעילויות שנרשמת אליהן, במקום אחד.',
    en: 'Every activity you signed up for, in one place.',
  },
  program: { he: 'לתוכנייה המלאה', en: 'Full program' },
  emptyTitle: { he: 'הלוח שלך עוד ריק', en: 'Your schedule is still empty' },
  emptyHint: {
    he: 'בחרו הרצאות, סדנאות וסיורים מהתוכנייה — והם יופיעו כאן כציר הזמן האישי שלכם.',
    en: 'Pick lectures, workshops and tours from the program — they will appear here as your personal timeline.',
  },
  filterEmptyTitle: { he: 'אין פעילויות בתצוגה הזו', en: 'Nothing in this view' },
  filterEmptyHint: {
    he: 'נסו יום אחר או מסנן אחר — או גללו למטה להצעות שמתאימות לכם.',
    en: 'Try another day or another filter — or scroll down for what suits you.',
  },
  conflict: {
    he: 'כבר נרשמת לפעילות אחרת באותו זמן.',
    en: 'You’re already registered for another activity at this time.',
  },
  full: {
    he: 'הפעילות התמלאה. נסו פעילות אחרת או הצטרפו לרשימת המתנה.',
    en: 'That activity just filled up. Try another or join the waiting list.',
  },
};

const SEGMENTS: { key: Segment; he: string; en: string }[] = [
  { key: 'all', he: 'הכול', en: 'All' },
  { key: 'today', he: 'היום', en: 'Today' },
  { key: 'upcoming', he: 'הקרובות', en: 'Upcoming' },
  { key: 'done', he: 'הסתיימו', en: 'Completed' },
  { key: 'cancelled', he: 'בוטלו', en: 'Cancelled' },
];

const endOf = (a: ActivityVM): number => a.endMs ?? a.startMs + HOUR;

/*
 * The same activity can reach us more than once — a guest who registered,
 * cancelled and registered again leaves several rows behind. The timeline
 * shows a moment in the day, not a paper trail, so each activity appears
 * exactly once.
 */
const uniqueById = (list: ActivityVM[]): ActivityVM[] => {
  const seen = new Set<string>();
  const out: ActivityVM[] = [];
  list.forEach((activity) => {
    if (seen.has(activity.id)) return;
    seen.add(activity.id);
    out.push(activity);
  });
  return out;
};

const hhmm = (ms: number): string => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/*
 * The personal command centre. It owns no data of its own: every card
 * below is one of the Program's activities, seen through the lens of the
 * participant's registrations. Same view models, same cards, same drawer
 * — only the filter differs. That is what keeps the two pages honest with
 * each other.
 */
const MyScheduleDashboard = ({
  locale,
  slug,
  eventTitle,
  activities,
  days,
  mine,
  todayKey,
  notice,
  venue,
  initialActivityId,
}: Props) => {
  const he = locale === 'he';
  const reduce = useReducedMotion();
  const favorites = useFavorites();
  const programHref = `/${locale}/program`;

  const pool = useMemo(() => uniqueById(activities), [activities]);

  const byId = useMemo(() => new Map(pool.map((a) => [a.id, a])), [pool]);

  /* Mine, in order — the timeline's whole source of truth. */
  const held = useMemo(() => {
    const ids = new Set([...mine.registeredIds, ...mine.waitingIds]);
    return pool
      .filter((a) => ids.has(a.id))
      .sort((a, b) => a.startMs - b.startMs);
  }, [pool, mine.registeredIds, mine.waitingIds]);

  const cancelled = useMemo(
    () =>
      uniqueById(
        mine.cancelledIds
          .map((id) => byId.get(id))
          .filter((a): a is ActivityVM => Boolean(a)),
      ).sort((a, b) => a.startMs - b.startMs),
    [mine.cancelledIds, byId],
  );

  const myDays = useMemo(() => {
    const keys = new Set(held.map((a) => a.dayKey));
    return days.filter((d) => keys.has(d.key));
  }, [days, held]);

  const [activeDay, setActiveDay] = useState<string>(
    () => myDays.find((d) => d.key === todayKey)?.key ?? myDays[0]?.key ?? '',
  );
  const [segment, setSegment] = useState<Segment>('all');
  const [selectedId, setSelectedId] = useState<string | null>(
    initialActivityId ?? null,
  );

  /* The clock the whole page reads from — one tick, many widgets. */
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  const clock = now ?? 0;

  const next = useMemo(() => {
    if (now === null) return null;
    return held.find((a) => a.startMs > now) ?? null;
  }, [held, now]);

  const current = useMemo(() => {
    if (now === null) return null;
    return held.find((a) => a.startMs <= now && endOf(a) > now) ?? null;
  }, [held, now]);

  /* The timeline. 'All' reads one day at a time; every other segment is a
   * question about time, so it answers across the whole conference. */
  const timeline = useMemo(() => {
    if (segment === 'cancelled') return cancelled;
    if (segment === 'all') return held.filter((a) => a.dayKey === activeDay);
    if (segment === 'today') return held.filter((a) => a.dayKey === todayKey);
    if (now === null) return held;
    if (segment === 'upcoming') return held.filter((a) => endOf(a) > now);
    return held.filter((a) => endOf(a) <= now);
  }, [segment, held, cancelled, activeDay, todayKey, now]);

  const selected = useMemo(
    () => byId.get(selectedId ?? '') ?? null,
    [byId, selectedId],
  );

  const related = useMemo(() => {
    if (!selected) return [];
    const speakerIds = new Set(selected.speakers.map((s) => s.id));
    return pool
      .filter(
        (a) =>
          a.id !== selected.id &&
          a.type !== 'break' &&
          (a.type === selected.type ||
            a.speakers.some((s) => speakerIds.has(s.id))),
      )
      .sort(
        (a, b) =>
          Math.abs(a.startMs - selected.startMs) -
          Math.abs(b.startMs - selected.startMs),
      )
      .slice(0, 3);
  }, [pool, selected]);

  /* ---- KPIs ---- */
  const doneCount = now === null ? 0 : held.filter((a) => endOf(a) <= now).length;
  const favCount = favorites.ids.filter((id) => byId.has(id)).length;
  const todayItems = held.filter((a) => a.dayKey === todayKey);
  const todayNext = todayItems.find((a) => now !== null && a.startMs > now);

  /*
   * A number on its own is trivia. Each card carries the sentence that
   * makes it useful: over how many days, what is coming next, out of how
   * many, why the star matters.
   */
  const kpis: KpiVM[] = [
    {
      key: 'total',
      label: he ? 'סה״כ פעילויות' : 'Total activities',
      value: held.length,
      sub: he
        ? `על פני ${myDays.length} ${myDays.length === 1 ? 'יום' : 'ימים'}`
        : `across ${myDays.length} ${myDays.length === 1 ? 'day' : 'days'}`,
      icon: 'calendar',
    },
    {
      key: 'today',
      label: he ? 'הפעילויות של היום' : 'Today',
      value: todayItems.length,
      sub: todayNext
        ? he
          ? `הבאה ב־${todayNext.time}`
          : `next at ${todayNext.time}`
        : he
          ? 'אין עוד פעילויות היום'
          : 'nothing else today',
      icon: 'clock',
    },
    {
      key: 'done',
      label: he ? 'הושלמו' : 'Completed',
      value: doneCount,
      sub: he
        ? `מתוך ${held.length} פעילויות`
        : `of ${held.length} activities`,
      icon: 'check',
    },
    {
      key: 'fav',
      label: he ? 'מועדפים' : 'Favorites',
      value: favCount,
      sub: he ? 'שמורים לצפייה' : 'saved for later',
      icon: 'star',
    },
  ];

  /* ---- Speakers of the day I built ---- */
  const mySpeakers: MySpeakerRowVM[] = useMemo(() => {
    const map = new Map<string, MySpeakerRowVM>();
    held.forEach((activity) => {
      activity.speakers.forEach((speaker) => {
        const existing = map.get(speaker.id);
        if (existing) {
          existing.count += 1;
          if (
            !existing.nextTime &&
            now !== null &&
            activity.startMs > now &&
            activity.time
          ) {
            existing.nextTime = activity.time;
            existing.nextTitle = activity.title;
          }
          return;
        }
        const upcoming = now !== null && activity.startMs > now;
        map.set(speaker.id, {
          id: speaker.id,
          name: speaker.name,
          ...(speaker.role ? { role: speaker.role } : {}),
          ...(speaker.company ? { company: speaker.company } : {}),
          ...(speaker.photoUrl ? { photoUrl: speaker.photoUrl } : {}),
          ...(upcoming && activity.time
            ? { nextTime: activity.time, nextTitle: activity.title }
            : {}),
          registered: speaker.registered,
          count: 1,
        });
      });
    });
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [held, now]);

  /* ---- Free time, and what fits inside it ---- */
  const gaps: GapSuggestion[] = useMemo(() => {
    const dayItems = held.filter((a) => a.dayKey === activeDay);
    const out: GapSuggestion[] = [];
    dayItems.forEach((activity, i) => {
      const following = dayItems[i + 1];
      if (!following) return;
      const from = endOf(activity);
      const to = following.startMs;
      const minutes = Math.round((to - from) / MIN);
      if (minutes < GAP_MIN) return;
      const options = pool
        .filter(
          (candidate) =>
            candidate.dayKey === activeDay &&
            candidate.type !== 'break' &&
            candidate.status !== 'full' &&
            candidate.registration === 'available' &&
            candidate.startMs >= from &&
            endOf(candidate) <= to,
        )
        .slice(0, 2);
      if (options.length === 0) return;
      out.push({
        key: `${activity.id}-${following.id}`,
        from: hhmm(from),
        to: hhmm(to),
        minutes,
        options,
      });
    });
    return out;
  }, [held, pool, activeDay]);

  /*
   * "You might also like" — read off the schedule the page already holds.
   * An activity qualifies when it is still open, still ahead, does not
   * collide with anything held, and shares a speaker or a kind with what
   * the participant already chose. Familiar first, then the rest of what
   * is open, so the section is never a wall of leftovers.
   */
  const discovery: ActivityVM[] = useMemo(() => {
    if (now === null) return [];
    const heldIds = new Set(held.map((a) => a.id));
    const mySpeakerIds = new Set(
      held.flatMap((a) => a.speakers.map((s) => s.id)),
    );
    const myTypes = new Set(held.map((a) => a.type));
    const free = (a: ActivityVM): boolean =>
      held.every((h) => a.startMs >= endOf(h) || endOf(a) <= h.startMs);

    const open = pool.filter(
      (a) =>
        !heldIds.has(a.id) &&
        a.type !== 'break' &&
        a.status !== 'full' &&
        a.registration === 'available' &&
        a.startMs > now &&
        free(a),
    );
    const score = (a: ActivityVM): number => {
      let value = 0;
      if (a.speakers.some((s) => mySpeakerIds.has(s.id))) value += 2;
      if (myTypes.has(a.type)) value += 1;
      if (favorites.has(a.id)) value += 3;
      return value;
    };
    return [...open]
      .sort((a, b) => score(b) - score(a) || a.startMs - b.startMs)
      .slice(0, 3);
  }, [pool, held, now, favorites]);

  /* ---- What changed, derived from what we already know ---- */
  const notices: BoardNoticeVM[] = useMemo(() => {
    const out: BoardNoticeVM[] = [];
    if (notice === 'conflict') {
      out.push({ id: 'conflict', tone: 'warn', text: COPY.conflict[locale] });
    }
    if (notice === 'full') {
      out.push({ id: 'full', tone: 'warn', text: COPY.full[locale] });
    }
    if (current) {
      out.push({
        id: `live-${current.id}`,
        tone: 'live',
        text: he
          ? `מתקיים עכשיו: ${current.title}${current.room ? ` · ${current.room}` : ''}`
          : `Happening now: ${current.title}${current.room ? ` · ${current.room}` : ''}`,
        activityId: current.id,
        actionLabel: he ? 'פרטים' : 'Details',
      });
    }
    if (next && now !== null) {
      const mins = Math.round((next.startMs - now) / MIN);
      if (mins <= 20) {
        out.push({
          id: `soon-${next.id}`,
          tone: 'soon',
          text: he
            ? `עוד ${mins} דקות: ${next.title}${next.room ? ` · ${next.room}` : ''}`
            : `In ${mins} min: ${next.title}${next.room ? ` · ${next.room}` : ''}`,
          activityId: next.id,
          actionLabel: he ? 'פרטים' : 'Details',
        });
      }
    }
    held
      .filter((a) => a.registration === 'waitlist')
      .slice(0, 2)
      .forEach((a) => {
        out.push({
          id: `wait-${a.id}`,
          tone: 'wait',
          text: he
            ? `אתם ברשימת ההמתנה ל־${a.title}. נעדכן ברגע שמתפנה מקום.`
            : `You are on the waiting list for ${a.title}. We will tell you the moment a seat opens.`,
          activityId: a.id,
          actionLabel: he ? 'פרטים' : 'Details',
        });
      });
    const almost = held.find(
      (a) =>
        a.registration === 'registered' &&
        a.status === 'almostFull' &&
        now !== null &&
        a.startMs > now,
    );
    if (almost) {
      out.push({
        id: `seat-${almost.id}`,
        tone: 'ok',
        text: he
          ? `המקום שלכם ב־${almost.title} שמור — הפעילות כמעט מלאה.`
          : `Your seat at ${almost.title} is held — the activity is nearly full.`,
        activityId: almost.id,
        actionLabel: he ? 'פרטים' : 'Details',
      });
    }
    return out;
  }, [notice, locale, current, next, now, he, held]);

  /* The bottom pill speaks only when something is about to happen; the
   * board in the sidebar keeps the rest. */
  const urgent = notices.filter(
    (item) => item.tone === 'live' || item.tone === 'soon' || item.tone === 'warn',
  );

  const heroState: HeroStateVM = {
    next: next ? { startMs: next.startMs, title: next.title } : null,
    current: current ? { title: current.title, endMs: endOf(current) } : null,
    todayTotal: todayItems.length,
    allDone: held.length > 0 && doneCount === held.length,
  };

  const dayCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    held.forEach((a) => {
      counts[a.dayKey] = (counts[a.dayKey] ?? 0) + 1;
    });
    return counts;
  }, [held]);

  /* The NOW line only belongs on a list that contains today. */
  const showNowLine =
    now !== null &&
    timeline.length > 0 &&
    timeline.some((a) => a.dayKey === todayKey);
  const nowIndex = showNowLine
    ? timeline.findIndex((a) => a.startMs > clock)
    : -1;
  const nowRow = showNowLine
    ? nowIndex === -1
      ? timeline.length
      : nowIndex
    : -1;

  const soonMins =
    next && now !== null ? Math.round((next.startMs - now) / MIN) : null;
  const showStickyNext = soonMins !== null && soonMins <= SOON_MIN;

  const empty = held.length === 0 && cancelled.length === 0;

  /*
   * Built once and placed twice — under the timeline when there is a day
   * to show, at the foot of the page when there is not. Only one of the
   * two ever renders, so the cards are never duplicated in the document.
   */
  const hasDiscovery = discovery.length > 0;
  const discoverySection = (
    <Discovery
      items={discovery}
      locale={locale}
      slug={slug}
      onOpen={setSelectedId}
      registerAction={registerActivityAction}
      leaveAction={leaveActivityAction}
    />
  );

  const nowLine = (
    <li aria-hidden="true" className="relative grid grid-cols-[46px_18px_1fr] items-center gap-2 sm:grid-cols-[54px_18px_1fr] sm:gap-3">
      <span className="text-end text-[11px] font-bold tabular-nums text-[var(--x-ok)]">
        {hhmm(clock)}
      </span>
      <span className="relative flex justify-center">
        <span className="size-2.5 rounded-full bg-[var(--x-ok)] ring-4 ring-[var(--x-bg)]" />
      </span>
      <span className="flex items-center gap-2">
        <span className="h-px flex-1 bg-[var(--x-ok)]/45" />
        <span className="rounded-[var(--x-r-pill)] bg-[var(--x-ok-wash)] px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[var(--x-ok)]">
          {he ? 'עכשיו' : 'Now'}
        </span>
      </span>
    </li>
  );

  return (
    <ToastProvider>
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-8 md:px-10 md:pb-16 md:pt-10">
        <ScheduleHero
          locale={locale}
          eventTitle={eventTitle}
          title={COPY.title[locale]}
          subtitle={COPY.sub[locale]}
          programHref={programHref}
          programLabel={COPY.program[locale]}
          dayKeys={days.map((d) => d.key)}
          todayKey={todayKey}
          state={heroState}
        />

        {empty ? (
          <div className="mt-8">
            <EmptyState
              title={COPY.emptyTitle[locale]}
              hint={COPY.emptyHint[locale]}
              icon={<IconCalendar className="size-6" />}
              action={
                <a
                  href={programHref}
                  className="inline-flex min-h-[48px] items-center gap-2 rounded-[var(--x-r-pill)] bg-[var(--x-primary)] px-6 text-sm font-semibold text-[var(--x-primary-ink)] shadow-[var(--x-shadow)] transition-colors hover:bg-[var(--x-primary-strong)]"
                >
                  {he ? 'בחרו פעילויות מהתוכנייה' : 'Browse the program'}
                  <IconArrow className="size-4 rtl:rotate-180" />
                </a>
              }
            />
          </div>
        ) : (
          <>
            <div className="mt-6">
              <KpiRow items={kpis} />
            </div>

            {/* Day strip + segmented filters */}
            <div className="mt-7 flex flex-col gap-4">
              {myDays.length > 1 ? (
                <DayTabs
                  days={myDays}
                  active={activeDay}
                  onSelect={(key) => {
                    setActiveDay(key);
                    setSegment('all');
                  }}
                  dayWord={he ? 'יום' : 'Day'}
                />
              ) : null}
              <div
                role="tablist"
                aria-label={he ? 'סינון הלוח' : 'Filter schedule'}
                className="-mx-6 flex snap-x snap-mandatory gap-2 overflow-x-auto px-6 pb-1 md:mx-0 md:flex-wrap md:px-0"
              >
                {SEGMENTS.map((item) => {
                  const on = item.key === segment;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      role="tab"
                      aria-selected={on}
                      onClick={() => setSegment(item.key)}
                      className={`relative shrink-0 snap-start rounded-[var(--x-r-pill)] px-4 py-2 text-[13px] font-semibold transition-colors ${
                        on
                          ? 'text-white'
                          : 'border border-[var(--x-line)] bg-[var(--x-surface)] text-[var(--x-soft)] hover:border-[var(--x-line-strong)]'
                      }`}
                    >
                      {on ? (
                        <motion.span
                          layoutId="my-segment"
                          transition={{ duration: reduce ? 0 : 0.3, ease: 'easeOut' }}
                          className="absolute inset-0 rounded-[var(--x-r-pill)] bg-[var(--x-nav)]"
                        />
                      ) : null}
                      <span className="relative">{he ? item.he : item.en}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Two rails, one grid. On a phone the four blocks read in the
                order the day demands — what is next, the day itself, the
                things you consult, then what else is open — because the
                wrappers are display:contents and the children order
                themselves inside the page's single column. From lg up the
                wrappers become real columns: utilities on the side, and the
                wide column carries the timeline with the discovery section
                directly beneath it. That adjacency is the point — a one-day
                schedule pulls "you might also like" straight up under the
                last card instead of leaving a field of white where the
                sidebar used to dictate the height. */}
            <div className="mt-8 grid gap-8 lg:grid-cols-[336px_1fr]">
              <div className="contents lg:flex lg:flex-col lg:gap-8">
                <div className="order-1">
                  <NextActivityCard
                    activity={next}
                    locale={locale}
                    onOpen={setSelectedId}
                    programHref={programHref}
                    {...(venue ? { venue } : {})}
                  />
                </div>

                <aside className="order-3 flex flex-col gap-5 lg:sticky lg:top-24">
                  <NoticeBoard
                    items={notices}
                    locale={locale}
                    onOpen={setSelectedId}
                  />
                  <ConferenceCalendar
                    days={myDays}
                    active={activeDay}
                    onSelect={(key) => {
                      setActiveDay(key);
                      setSegment('all');
                    }}
                    locale={locale}
                    counts={dayCounts}
                  />
                  <MySpeakers speakers={mySpeakers} locale={locale} />
                  <FreeTime gaps={gaps} locale={locale} onOpen={setSelectedId} />
                  <ExportCard activities={held} next={next} locale={locale} />
                </aside>
              </div>

              <div className="contents min-w-0 lg:flex lg:flex-col">
                <div className="order-2 min-w-0">
                  {showStickyNext && next ? (
                    <div className="sticky top-[68px] z-20 mb-4 lg:hidden">
                      <button
                        type="button"
                        onClick={() => setSelectedId(next.id)}
                        className="flex w-full items-center gap-3 rounded-[var(--x-r-pill)] bg-[var(--x-navy)] px-4 py-2.5 text-start text-white shadow-[var(--x-shadow-lift)]"
                      >
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/10 text-[11px] font-bold tabular-nums">
                          {soonMins}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--x-gold-soft)]">
                            {he ? `עוד ${soonMins} דקות` : `in ${soonMins} min`}
                          </span>
                          <span className="block truncate text-[13px] font-semibold">
                            {next.title}
                          </span>
                        </span>
                        <IconArrow className="size-4 shrink-0 opacity-70 rtl:rotate-180" />
                      </button>
                    </div>
                  ) : null}

                  {timeline.length === 0 ? (
                    <EmptyState
                      title={COPY.filterEmptyTitle[locale]}
                      hint={COPY.filterEmptyHint[locale]}
                      icon={<IconCalendar className="size-6" />}
                      action={
                        <button
                          type="button"
                          onClick={() => setSegment('all')}
                          className="inline-flex min-h-[44px] items-center gap-2 rounded-[var(--x-r-pill)] border border-[var(--x-line)] bg-[var(--x-surface)] px-5 text-sm font-semibold text-[var(--x-primary)] transition-colors hover:bg-[var(--x-primary-wash)]"
                        >
                          {he ? 'הצגת כל הפעילויות' : 'Show everything'}
                        </button>
                      }
                    />
                  ) : (
                    <ol className="relative flex flex-col gap-4">
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute bottom-3 top-3 start-[54px] w-px bg-[var(--x-line-strong)] sm:start-[62px]"
                      />
                      {timeline.map((activity, i) => {
                        const live =
                          now !== null &&
                          activity.startMs <= clock &&
                          endOf(activity) > clock;
                        return (
                          <Fragment key={activity.id}>
                            {nowRow === i ? nowLine : null}
                            <li className="relative grid grid-cols-[46px_18px_1fr] items-start gap-2 sm:grid-cols-[54px_18px_1fr] sm:gap-3">
                              <span className="pt-4 text-end text-sm font-semibold tabular-nums text-[var(--x-ink)]">
                                {activity.time}
                              </span>
                              <span className="relative flex justify-center pt-[22px]">
                                <span
                                  className={`size-2.5 rounded-full ring-4 ring-[var(--x-bg)] ${
                                    live
                                      ? 'x-live-dot bg-[var(--x-live)]'
                                      : activity.registration === 'registered'
                                        ? 'bg-[var(--x-ok)]'
                                        : 'bg-[var(--x-primary)]'
                                  }`}
                                />
                              </span>
                              <div
                                className={
                                  live
                                    ? 'rounded-[var(--x-r-card)] ring-2 ring-[var(--x-primary)] ring-offset-2 ring-offset-[var(--x-bg)]'
                                    : undefined
                                }
                              >
                                <ActivityCard
                                  activity={activity}
                                  locale={locale}
                                  slug={slug}
                                  onOpen={setSelectedId}
                                  registerAction={registerActivityAction}
                                  leaveAction={leaveActivityAction}
                                  index={i}
                                  rich
                                />
                              </div>
                            </li>
                          </Fragment>
                        );
                      })}
                      {nowRow === timeline.length ? nowLine : null}
                    </ol>
                  )}
                </div>

                {hasDiscovery ? (
                  <div className="order-4 min-w-0">{discoverySection}</div>
                ) : null}
              </div>
            </div>
          </>
        )}

        {/* With nothing in the schedule at all there is no timeline to sit
            under, so the same section closes the empty page instead. */}
        {empty ? discoverySection : null}
      </main>

      <NotificationBar items={urgent} locale={locale} onAction={setSelectedId} />

      <ActivityDrawer
        activity={selected}
        related={related}
        onOpenRelated={setSelectedId}
        locale={locale}
        slug={slug}
        onClose={() => setSelectedId(null)}
        registerAction={registerActivityAction}
        leaveAction={leaveActivityAction}
      />
    </ToastProvider>
  );
};

export default MyScheduleDashboard;
