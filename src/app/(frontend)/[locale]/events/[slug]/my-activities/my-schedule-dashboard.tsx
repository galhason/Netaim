'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import type { Locale } from '@/config/locales';
import {
  ActivityDrawer,
  IconArrow,
  IconCalendar,
  IconChevronDown,
  IconWarn,
  ToastProvider,
  useFavorites,
  type ActivityVM,
  type DayVM,
  type MyRegistrationsVM,
} from '@/features/conference';
import { registerActivityAction, leaveActivityAction } from './actions';
import { PageLeaves } from './botanical';
import { t } from './copy';
import DaySelector from './day-selector';
import type { MeetingVM } from './meetings';
import NextActivityCard from './next-activity-card';
import NotificationBar, { type NoticeVM } from './notification-bar';
import ScheduleRow from './schedule-row';
import ScheduleSidebar from './schedule-sidebar';
import {
  MINUTE,
  endOf,
  findConflicts,
  fromActivity,
  fromMeeting,
  titleOf,
  venueClock,
  type TimelineItem,
} from './timeline';

interface Props {
  locale: Locale;
  slug: string;
  eventTitle: string;
  activities: ActivityVM[];
  days: DayVM[];
  mine: MyRegistrationsVM;
  meetings: MeetingVM[];
  todayKey: string;
  /*
   * The conference's own dates, as the organiser set them. The
   * programme's days are not the same thing: a timetable filled in for
   * the first morning only would otherwise declare a three-day
   * conference over by lunchtime.
   */
  startsAt?: string;
  endsAt?: string;
  notice: string | null;
  venue?: string;
  initialActivityId?: string | null;
}

const DAY_MS = 86400000;

/*
 * The same activity can reach us more than once — a guest who registered,
 * cancelled and registered again leaves several rows behind. The timeline
 * shows a moment in the day, not a paper trail, so each appears once.
 */
const uniqueById = (list: ActivityVM[]): ActivityVM[] => {
  const seen = new Set<string>();
  return list.filter((activity) => {
    if (seen.has(activity.id)) return false;
    seen.add(activity.id);
    return true;
  });
};

const primaryBtn =
  'inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[var(--x-r-pill)] bg-[var(--x-primary)] px-5 text-[14px] font-semibold text-[var(--x-primary-ink)] shadow-[0_8px_24px_rgba(23,63,115,0.24)] transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-[var(--x-primary-strong)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--x-ring)] motion-reduce:transition-none';
const ghostBtn =
  'inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[var(--x-r-pill)] border border-[var(--x-line)] bg-[var(--x-surface)] px-5 text-[14px] font-semibold text-[var(--x-primary)] transition-colors hover:border-[var(--x-primary)]/40 hover:bg-[var(--x-primary-wash)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--x-ring)]';

/* A calendar with an empty page — drawn, so the empty state has a picture without an asset. */
const EmptyCalendar = () => (
  <svg viewBox="0 0 120 100" aria-hidden="true" className="mx-auto h-24 w-auto">
    <rect x="14" y="18" width="92" height="72" rx="12" fill="var(--x-surface)" stroke="var(--x-line-strong)" strokeWidth="2" />
    <rect x="14" y="18" width="92" height="20" rx="12" fill="var(--x-primary-wash)" />
    <rect x="14" y="30" width="92" height="8" fill="var(--x-primary-wash)" />
    <path d="M36 12v12M84 12v12" stroke="var(--x-primary)" strokeWidth="3" strokeLinecap="round" />
    <g fill="var(--x-line)">
      <rect x="28" y="48" width="14" height="10" rx="3" />
      <rect x="53" y="48" width="14" height="10" rx="3" />
      <rect x="78" y="48" width="14" height="10" rx="3" />
      <rect x="28" y="66" width="14" height="10" rx="3" />
      <rect x="78" y="66" width="14" height="10" rx="3" />
    </g>
    <rect x="53" y="66" width="14" height="10" rx="3" fill="var(--x-primary)" opacity=".85" />
  </svg>
);

/*
 * The personal day.
 *
 * It owns no data of its own: every row is one of the Program's activities
 * seen through the lens of the participant's registrations, plus the
 * meetings they confirmed. Same view models, same drawer, same server
 * actions — only the filter differs, which is what keeps this page and the
 * Program honest with each other.
 */
const MyScheduleDashboard = ({
  locale,
  slug,
  eventTitle,
  activities,
  days,
  mine,
  meetings,
  todayKey,
  startsAt,
  endsAt,
  notice,
  venue,
  initialActivityId,
}: Props) => {
  const he = locale === 'he';
  const favorites = useFavorites();
  const programHref = `/${locale}/program`;
  const meHref = `/${locale}/me`;
  const networkingHref = `/${locale}/me/networking`;

  const pool = useMemo(() => uniqueById(activities), [activities]);
  const waitingIds = useMemo(() => new Set(mine.waitingIds), [mine.waitingIds]);
  const byId = useMemo(() => new Map(pool.map((a) => [a.id, a])), [pool]);

  /* Mine, in order — the timeline's whole source of truth. */
  const held = useMemo(() => {
    const ids = new Set([...mine.registeredIds, ...mine.waitingIds]);
    return pool.filter((a) => ids.has(a.id));
  }, [pool, mine.registeredIds, mine.waitingIds]);

  const items = useMemo<TimelineItem[]>(
    () =>
      [...held.map(fromActivity), ...meetings.map(fromMeeting)].sort(
        (a, b) => a.startMs - b.startMs,
      ),
    [held, meetings],
  );

  const cancelled = useMemo(
    () =>
      uniqueById(
        mine.cancelledIds
          .map((id) => byId.get(id))
          .filter((a): a is ActivityVM => Boolean(a)),
      ).sort((a, b) => a.startMs - b.startMs),
    [mine.cancelledIds, byId],
  );

  /*
   * Which days carry something of mine. The selector shows every day of
   * the conference — a day with nothing on it is a fact worth seeing —
   * but a meeting on a day the programme does not know about still gets
   * a tab, so nothing held can be unreachable.
   */
  const allDays = useMemo(() => {
    const known = new Set(days.map((d) => d.key));
    const extra = [...new Set(items.map((i) => i.dayKey))]
      .filter((key) => !known.has(key))
      .sort();
    const list = [...days];
    extra.forEach((key) => {
      const date = new Date(`${key}T00:00:00`);
      const fmt = (opts: Intl.DateTimeFormatOptions) =>
        new Intl.DateTimeFormat(he ? 'he-IL' : 'en-GB', opts).format(date);
      list.push({
        key,
        index: 0,
        weekday: fmt({ weekday: 'short' }),
        dateNum: fmt({ day: 'numeric', month: 'numeric' }),
        month: fmt({ month: 'long' }),
        full: fmt({ weekday: 'long', day: 'numeric', month: 'long' }),
      });
    });
    return list
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((day, i) => ({ ...day, index: i + 1 }));
  }, [days, items, he]);

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    items.forEach((item) => {
      out[item.dayKey] = (out[item.dayKey] ?? 0) + 1;
    });
    return out;
  }, [items]);

  /* Today if the conference is on; otherwise the first day with something. */
  const [activeDay, setActiveDay] = useState<string>(() => {
    if (allDays.some((d) => d.key === todayKey)) return todayKey;
    return items[0]?.dayKey ?? allDays[0]?.key ?? '';
  });
  const [selectedId, setSelectedId] = useState<string | null>(initialActivityId ?? null);

  /* The clock the whole page reads from — one tick, every widget. */
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const current = useMemo(() => {
    if (now === null) return null;
    return items.find((i) => i.startMs <= now && i.endMs > now) ?? null;
  }, [items, now]);

  const next = useMemo(() => {
    if (now === null) return null;
    return items.find((i) => i.startMs > now) ?? null;
  }, [items, now]);

  const dayItems = useMemo(
    () => items.filter((i) => i.dayKey === activeDay),
    [items, activeDay],
  );

  const conflicts = useMemo(() => findConflicts(dayItems), [dayItems]);
  const conflicted = useMemo(
    () => new Set(conflicts.flatMap((c) => [c.a.id, c.b.id])),
    [conflicts],
  );

  const selected = useMemo(() => byId.get(selectedId ?? '') ?? null, [byId, selectedId]);

  const related = useMemo(() => {
    if (!selected) return [];
    const speakerIds = new Set(selected.speakers.map((s) => s.id));
    return pool
      .filter(
        (a) =>
          a.id !== selected.id &&
          a.type !== 'break' &&
          (a.type === selected.type || a.speakers.some((s) => speakerIds.has(s.id))),
      )
      .sort((a, b) => Math.abs(a.startMs - selected.startMs) - Math.abs(b.startMs - selected.startMs))
      .slice(0, 3);
  }, [pool, selected]);

  /* ---- the sidebar's numbers ---- */
  const summary = useMemo(
    () => ({
      saved: items.length,
      hours: items.reduce((sum, i) => sum + (i.endMs - i.startMs), 0) / 3600000,
      days: allDays.length,
    }),
    [items, allDays],
  );

  /*
   * "Close to what you chose": open, still ahead, free in the schedule,
   * and sharing a speaker or a kind with something held. Two at most —
   * the sidebar is a margin, not a second programme.
   */
  const suggestions = useMemo(() => {
    if (now === null) return [];
    const heldIds = new Set(held.map((a) => a.id));
    const mySpeakerIds = new Set(held.flatMap((a) => a.speakers.map((s) => s.id)));
    const myTypes = new Set(held.map((a) => a.type));
    const free = (a: ActivityVM): boolean =>
      items.every((i) => a.startMs >= i.endMs || endOf(a) <= i.startMs);
    const score = (a: ActivityVM): number =>
      (a.speakers.some((s) => mySpeakerIds.has(s.id)) ? 2 : 0) +
      (myTypes.has(a.type) ? 1 : 0) +
      (favorites.has(a.id) ? 3 : 0);
    return pool
      .filter(
        (a) =>
          !heldIds.has(a.id) &&
          a.type !== 'break' &&
          a.status !== 'full' &&
          a.registration === 'available' &&
          a.startMs > now &&
          free(a),
      )
      .sort((a, b) => score(b) - score(a) || a.startMs - b.startMs)
      .slice(0, 2);
  }, [pool, held, items, now, favorites]);

  /* ---- what deserves the bar at the foot of the screen ---- */
  const urgent: NoticeVM[] = useMemo(() => {
    const out: NoticeVM[] = [];
    if (notice === 'conflict') out.push({ id: 'conflict', text: t(locale, 'noticeConflict') });
    if (notice === 'full') out.push({ id: 'full', text: t(locale, 'noticeFull') });
    if (current && current.kind === 'activity') {
      out.push({
        id: `live-${current.id}`,
        text: `${t(locale, 'live')}: ${titleOf(current)}${current.activity.room ? ` · ${current.activity.room}` : ''}`,
        activityId: current.id,
        actionLabel: t(locale, 'viewActivity'),
      });
    }
    if (next && now !== null) {
      const mins = Math.round((next.startMs - now) / MINUTE);
      if (mins <= 20) {
        out.push({
          id: `soon-${next.id}`,
          text: he
            ? `עוד ${mins} דקות: ${titleOf(next)}`
            : `In ${mins} min: ${titleOf(next)}`,
          ...(next.kind === 'activity'
            ? { activityId: next.id, actionLabel: t(locale, 'viewActivity') }
            : {}),
        });
      }
    }
    return out;
  }, [notice, locale, current, next, now, he]);

  /* ---- where the conference stands ---- */
  /*
   * The conference's own dates answer this, and the programme's days
   * only stand in when it has none. They are different questions: the
   * days are wherever activities happen to have been scheduled, and a
   * timetable that has only been filled in for the opening morning does
   * not mean the conference is over.
   */
  const dayKeyOf = (iso?: string): string => {
    if (!iso) return '';
    const parsed = Date.parse(iso);
    return Number.isNaN(parsed) ? '' : new Date(parsed).toISOString().slice(0, 10);
  };
  const firstDay = dayKeyOf(startsAt) || (allDays[0]?.key ?? '');
  const lastDay =
    dayKeyOf(endsAt) || dayKeyOf(startsAt) || (allDays[allDays.length - 1]?.key ?? '');
  const ended = Boolean(lastDay) && todayKey > lastDay;
  const daysUntil =
    firstDay && todayKey < firstDay
      ? Math.max(
          1,
          Math.round(
            (new Date(`${firstDay}T00:00:00`).getTime() - new Date(`${todayKey}T00:00:00`).getTime()) /
              DAY_MS,
          ),
        )
      : 0;

  const activeDayVM = allDays.find((d) => d.key === activeDay) ?? null;
  const isToday = activeDay === todayKey;
  const clock = now ?? 0;

  /* The NOW line sits between the last thing that started and the first that has not. */
  const nowIndex =
    isToday && now !== null && dayItems.length > 0
      ? (() => {
          const i = dayItems.findIndex((item) => item.startMs > clock);
          return i === -1 ? dayItems.length : i;
        })()
      : -1;

  const nowLine = (
    <li
      aria-label={`${t(locale, 'now')} ${venueClock(clock)}`}
      className="grid grid-cols-[40px_14px_1fr] items-center gap-1.5 sm:grid-cols-[54px_18px_1fr] sm:gap-3"
    >
      <span className="text-end text-[12px] font-bold tabular-nums text-[var(--x-live)]">
        {venueClock(clock)}
      </span>
      <span className="relative flex justify-center">
        <span className="size-2.5 rounded-full bg-[var(--x-live)] ring-4 ring-[var(--x-bg)]" />
      </span>
      <span className="flex items-center gap-2">
        <span className="h-px flex-1 bg-[var(--x-live)]/50" />
        <span className="rounded-[var(--x-r-pill)] bg-[var(--x-live)]/10 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[var(--x-live)] rtl:tracking-normal">
          {t(locale, 'now')} · {venueClock(clock)}
        </span>
      </span>
    </li>
  );

  /* Nothing held now — whatever was cancelled along the way. */
  const empty = items.length === 0;
  /*
   * Cancellations are history, not a schedule: they sit folded under
   * whatever the page shows, including the empty page — a person who
   * gave everything up should still be able to find their way back.
   */
  const cancelledSection =
    cancelled.length > 0 ? (
      <details className="group mt-6 rounded-[var(--x-r-card)] border border-[var(--x-line)] bg-[var(--x-surface)] text-start">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 text-[14px] font-semibold text-[var(--x-ink)] [&::-webkit-details-marker]:hidden">
          <span className="flex-1">
            {t(locale, 'cancelledByYou')}{' '}
            <span className="text-[var(--x-faint)]">({cancelled.length})</span>
          </span>
          <IconChevronDown className="size-4 text-[var(--x-faint)] transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-[var(--x-line)] px-4 pb-4 pt-3">
          <p className="text-[13px] text-[var(--x-soft)]">{t(locale, 'cancelledHint')}</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {cancelled.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(a.id)}
                  className="flex w-full items-center gap-3 rounded-[var(--x-r-field)] px-2 py-2 text-start text-[13.5px] transition-colors hover:bg-[var(--x-raise)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--x-ring)]"
                >
                  <span dir="ltr" className="w-12 shrink-0 tabular-nums text-[var(--x-faint)]">{a.time}</span>
                  <span className="min-w-0 flex-1 truncate text-[var(--x-ink)] line-through decoration-[var(--x-faint)]">
                    {a.title}
                  </span>
                  <IconArrow className="size-4 shrink-0 text-[var(--x-faint)] rtl:rotate-180" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </details>
    ) : null;

  const exportTarget =
    next && next.kind === 'activity' ? next.activity : (held.find((a) => now !== null && a.startMs > now) ?? null);

  return (
    <ToastProvider>
      <main
        id="main-content"
        className="relative mx-auto max-w-6xl overflow-x-clip px-5 pb-24 pt-8 md:px-10 md:pb-16 md:pt-10"
      >
        <PageLeaves />

        {/* ---- header ---- */}
        <header className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <a
              href={meHref}
              className="inline-flex min-h-[32px] items-center gap-1.5 text-[13px] font-medium text-[var(--x-soft)] transition-colors hover:text-[var(--x-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--x-ring)] rounded-[var(--x-r-pill)]"
            >
              <IconArrow className="size-4 rotate-180 rtl:rotate-0" />
              {t(locale, 'backToMe')}
            </a>
            <div className="mt-2 flex items-center gap-4">
              <span className="hidden size-14 shrink-0 place-items-center rounded-full bg-[var(--x-primary-wash)] text-[var(--x-primary)] sm:grid">
                <IconCalendar className="size-7" />
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[var(--x-primary)] rtl:tracking-normal">
                  {eventTitle}
                </p>
                <h1 className="mt-1 font-display text-[2rem] font-extrabold leading-[1.1] tracking-tight text-[var(--x-ink)] sm:text-[2.4rem]">
                  {t(locale, 'title')}
                </h1>
              </div>
            </div>
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-[var(--x-soft)]">
              {t(locale, 'sub')}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row md:w-[200px] md:flex-col md:items-stretch">
            <a href={programHref} className={primaryBtn}>
              <span aria-hidden="true" className="text-[18px] leading-none">+</span>
              {t(locale, 'addActivity')}
            </a>
            <a href={programHref} className={ghostBtn}>
              <IconCalendar className="size-4" />
              {t(locale, 'toProgram')}
            </a>
          </div>
        </header>

        {empty ? (
          <section className="relative mx-auto mt-10 max-w-xl rounded-[var(--x-r-card)] border border-[var(--x-line)] bg-[var(--x-surface)] px-6 py-12 text-center shadow-[var(--x-shadow)]">
            <EmptyCalendar />
            <h2 className="mt-5 font-display text-[22px] font-bold tracking-tight text-[var(--x-ink)]">
              {t(locale, 'emptyTitle')}
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-[var(--x-soft)]">
              {t(locale, 'emptyHint')}
            </p>
            <a href={programHref} className={`${primaryBtn} mt-6`}>
              {t(locale, 'toProgram')}
              <IconArrow className="size-4 rtl:rotate-180" />
            </a>
            {cancelledSection}
          </section>
        ) : (
          <>
            <div className="relative mt-8">
              <DaySelector
                days={allDays}
                active={activeDay}
                todayKey={todayKey}
                counts={counts}
                locale={locale}
                onSelect={setActiveDay}
              />
            </div>

            <div className="relative mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_288px] lg:gap-10">
              <div className="min-w-0">
                {/* ---- where the conference stands, when it is not today ---- */}
                {ended ? (
                  <div className="mb-5 flex items-center gap-3 rounded-[var(--x-r-card)] border border-[var(--x-line)] bg-[var(--x-surface)] px-4 py-3.5 text-[14px] text-[var(--x-soft)]">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--x-ok-wash)] text-[var(--x-ok)]">
                      <IconCalendar className="size-4" />
                    </span>
                    <span>
                      <span className="block font-semibold text-[var(--x-ink)]">{t(locale, 'endedTitle')}</span>
                      {t(locale, 'endedHint')}
                    </span>
                  </div>
                ) : daysUntil > 0 ? (
                  <p className="mb-4 text-[13px] font-medium text-[var(--x-soft)]">
                    {daysUntil === 1
                      ? t(locale, 'tomorrow')
                      : `${t(locale, 'startsIn_days')} ${daysUntil} ${t(locale, 'daysWord')}`}
                  </p>
                ) : null}

                {conflicts.length > 0 ? (
                  <div
                    role="alert"
                    className="mb-5 flex gap-3 rounded-[var(--x-r-card)] border border-[var(--x-warn)]/40 bg-[var(--x-warn-wash)] p-4"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--x-surface)] text-[var(--x-warn)]">
                      <IconWarn className="size-5" />
                    </span>
                    <div className="min-w-0 text-[14px]">
                      <p className="font-semibold text-[var(--x-ink)]">{t(locale, 'conflictTitle')}</p>
                      <p className="mt-0.5 text-[var(--x-soft)]">{t(locale, 'conflictBody')}</p>
                      <ul className="mt-2 flex flex-col gap-1 text-[13px] text-[var(--x-ink)]">
                        {conflicts.map((c) => (
                          <li key={`${c.a.id}-${c.b.id}`}>
                            <span className="font-semibold">{titleOf(c.a)}</span>
                            {' ↔ '}
                            <span className="font-semibold">{titleOf(c.b)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : null}

                {!ended ? (
                  <NextActivityCard
                    current={current}
                    next={next}
                    todayIsConferenceDay={allDays.some((d) => d.key === todayKey)}
                    now={now}
                    waiting={waitingIds.has((current ?? next)?.id ?? '')}
                    locale={locale}
                    programHref={programHref}
                    networkingHref={networkingHref}
                    onOpen={setSelectedId}
                    {...(venue ? { venue } : {})}
                  />
                ) : null}

                {/* ---- the day ---- */}
                <div className="mt-8 flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-display text-[20px] font-bold tracking-tight text-[var(--x-ink)]">
                    {t(locale, 'timelineTitle')}
                  </h2>
                  {activeDayVM ? (
                    <p className="text-[13px] text-[var(--x-soft)]">{activeDayVM.full}</p>
                  ) : null}
                </div>

                {dayItems.length === 0 ? (
                  <section className="mt-4 rounded-[var(--x-r-card)] border border-dashed border-[var(--x-line-strong)] bg-[var(--x-surface)] px-6 py-10 text-center">
                    <EmptyCalendar />
                    <p className="mt-4 font-display text-[17px] font-bold text-[var(--x-ink)]">
                      {t(locale, 'emptyDayTitle')}
                    </p>
                    <p className="mt-1 text-[14px] text-[var(--x-soft)]">
                      {items.length > 0 ? t(locale, 'emptyDayHint') : t(locale, 'emptyHint')}
                    </p>
                    <a href={programHref} className={`${ghostBtn} mt-5`}>
                      {t(locale, 'toProgram')}
                      <IconArrow className="size-4 rtl:rotate-180" />
                    </a>
                  </section>
                ) : (
                  <ol
                    id="my-schedule-timeline"
                    role="tabpanel"
                    aria-labelledby={`day-tab-${activeDay}`}
                    className="relative mt-4 flex flex-col gap-3"
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute bottom-4 top-4 start-[46px] w-px bg-[var(--x-line-strong)] sm:start-[62px]"
                    />
                    {dayItems.map((item, i) => {
                      const live = now !== null && item.startMs <= clock && item.endMs > clock;
                      const past = now !== null && item.endMs <= clock;
                      const time = item.kind === 'activity' ? item.activity.time : item.meeting.time;
                      return (
                        <Fragment key={item.id}>
                          {nowIndex === i ? nowLine : null}
                          <li className="grid grid-cols-[40px_14px_1fr] items-start gap-1.5 sm:grid-cols-[54px_18px_1fr] sm:gap-3">
                            <span
                              dir="ltr"
                              className={`pt-[18px] text-end text-[12px] font-bold tabular-nums sm:text-[13px] ${
                                live ? 'text-[var(--x-primary)]' : past ? 'text-[var(--x-faint)]' : 'text-[var(--x-ink)]'
                              }`}
                            >
                              {time}
                            </span>
                            <span className="relative flex justify-center pt-[22px]">
                              <span
                                className={`size-2.5 rounded-full ring-4 ring-[var(--x-bg)] ${
                                  live
                                    ? 'x-live-dot bg-[var(--x-primary)]'
                                    : past
                                      ? 'bg-[var(--x-line-strong)]'
                                      : 'bg-[var(--x-primary)]'
                                }`}
                              />
                            </span>
                            <ScheduleRow
                              item={item}
                              locale={locale}
                              slug={slug}
                              live={live}
                              past={past}
                              conflict={conflicted.has(item.id)}
                              waiting={waitingIds.has(item.id)}
                              onOpen={setSelectedId}
                              leaveAction={leaveActivityAction}
                              networkingHref={networkingHref}
                            />
                          </li>
                        </Fragment>
                      );
                    })}
                    {nowIndex === dayItems.length ? nowLine : null}
                  </ol>
                )}

                {dayItems.length > 0 ? (
                  <p className="mt-6 flex items-center gap-3 text-[13px] text-[var(--x-faint)]">
                    <span className="h-px flex-1 bg-[var(--x-line)]" />
                    {t(locale, 'endOfList')}
                    <span className="h-px flex-1 bg-[var(--x-line)]" />
                  </p>
                ) : null}

                {cancelledSection}
              </div>

              <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
                <ScheduleSidebar
                  locale={locale}
                  summary={summary}
                  suggestions={suggestions}
                  exportTarget={exportTarget}
                  programHref={programHref}
                  onOpen={setSelectedId}
                />
              </aside>
            </div>
          </>
        )}
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
