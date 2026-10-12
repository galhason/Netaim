'use client';

import Link from 'next/link';
import type { Locale } from '@/config/locales';
import type { ActivityVM, ProgramInsights, ScheduleItemVM } from '../types';
import { Avatar, GhostLink, surface } from '../ui/kit';
import { IconArrow, IconCalendar, IconCheck, IconChevronLeft, IconClock, IconPin, IconWarn } from '../ui/icons';

/*
 * Conference insights — the calendar's replacement. Orientation that helps
 * the participant act: what they hold, what's left, how far the conference
 * has come. Numbers that answer "what should I do next?", not decoration.
 */
export const InsightsCard = ({
  insights,
  locale,
}: {
  insights: ProgramInsights;
  locale: Locale;
}) => {
  const he = locale === 'he';
  const tiles = [
    { label: he ? 'רשומ/ה' : 'Registered', value: insights.registeredCount, tone: 'text-[var(--x-ok)]' },
    { label: he ? 'בהמתנה' : 'Waiting list', value: insights.waitingCount, tone: 'text-[var(--x-wait)]' },
    { label: he ? 'מקומות פנויים' : 'Seats left', value: insights.remainingSeats, tone: 'text-[var(--x-ink)]' },
    { label: he ? 'פעילויות' : 'Activities', value: insights.totalActivities, tone: 'text-[var(--x-ink)]' },
  ];
  return (
    <section className={`${surface} border border-[var(--x-line)] p-5`}>
      <h3 className="font-display text-base font-bold text-[var(--x-ink)]">
        {he ? 'במבט מהיר' : 'At a glance'}
      </h3>
      <div className="mt-3.5 grid grid-cols-2 gap-2.5">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="rounded-[var(--x-r-field)] border border-[var(--x-line)] bg-[var(--x-raise)] px-3.5 py-3"
          >
            <p className={`font-display text-2xl font-bold tabular-nums ${t.tone}`}>
              {t.value}
            </p>
            <p className="mt-0.5 text-xs text-[var(--x-soft)]">{t.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

/*
 * My Schedule — a compact dashboard of the participant's own plan: what's
 * next, then everything they hold. It reflects the registrations; it never
 * owns them.
 */
export const MyScheduleWidget = ({
  items,
  insights,
  locale,
  onJump,
}: {
  items: ScheduleItemVM[];
  insights: ProgramInsights;
  locale: Locale;
  onJump?: (dayKey: string, id: string) => void;
}) => {
  const he = locale === 'he';
  return (
    <section className={`${surface} border border-[var(--x-line)] p-5`}>
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-base font-bold text-[var(--x-ink)]">
          {he ? 'הלוח שלי' : 'My schedule'}
        </h3>
        {insights.hoursRegistered > 0 ? (
          <span className="inline-flex items-center gap-1 text-xs text-[var(--x-soft)]">
            <IconClock className="size-3.5" />
            {he
              ? `${insights.hoursRegistered} שעות`
              : `${insights.hoursRegistered}h`}
          </span>
        ) : null}
      </div>

      {insights.next ? (
        <button
          type="button"
          onClick={() => onJump?.(insights.next!.dayKey, insights.next!.id)}
          className="mt-3 flex w-full items-center gap-3 rounded-[var(--x-r-field)] border border-[var(--x-primary)]/25 bg-[var(--x-primary-wash)] px-3.5 py-3 text-start transition-colors hover:border-[var(--x-primary)]/45"
        >
          <span className="w-12 flex-none">
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--x-primary)]">
              {he ? 'הבא' : 'Next'}
            </span>
            <span className="block text-sm font-bold tabular-nums text-[var(--x-primary-strong)]">
              {insights.next.time}
            </span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-[var(--x-ink)]">
              {insights.next.title}
            </span>
            {insights.next.room ? (
              <span className="block truncate text-xs text-[var(--x-soft)]">
                {insights.next.room}
              </span>
            ) : null}
          </span>
          <IconArrow className="size-4 flex-none text-[var(--x-primary)] rtl:-scale-x-100" />
        </button>
      ) : null}

      {items.length === 0 ? (
        <p className="mt-3 rounded-[var(--x-r-field)] border border-dashed border-[var(--x-line)] px-4 py-5 text-center text-sm text-[var(--x-faint)]">
          {he
            ? 'עדיין לא הוספת פעילויות ללוח שלך.'
            : 'You haven’t added any activities yet.'}
        </p>
      ) : (
        <ul className="mt-2 flex flex-col">
          {items.slice(0, 5).map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onJump?.(item.dayKey, item.id)}
                className="flex w-full items-center gap-3 rounded-[var(--x-r-field)] px-2.5 py-2 text-start transition-colors hover:bg-[var(--x-raise)]"
              >
                <span className="w-11 flex-none text-sm font-semibold tabular-nums text-[var(--x-soft)]">
                  {item.time}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-[var(--x-ink)]">
                  {item.title}
                </span>
                <span className="grid size-5 flex-none place-items-center rounded-full bg-[var(--x-ok-wash)] text-[var(--x-ok)]">
                  <IconCheck className="size-3.5" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 border-t border-[var(--x-line)] pt-3">
        <GhostLink href={`/${locale}/me`}>
          {he ? 'לאזור האישי שלי' : 'Open my area'}
        </GhostLink>
      </div>
    </section>
  );
};

/*
 * My plan — the programme's sidebar as the approved design draws it:
 * how many places I hold, the next one, the day in brief, the way to
 * the full personal schedule, and whether anything I hold collides.
 * It reads the registrations; it never owns them.
 */
export const MyPlanCard = ({
  items,
  insights,
  next,
  conflicts,
  locale,
  slug,
  onJump,
}: {
  items: ScheduleItemVM[];
  insights: ProgramInsights;
  next?: ActivityVM;
  conflicts: number;
  locale: Locale;
  slug: string;
  onJump?: (dayKey: string, id: string) => void;
}) => {
  const he = locale === 'he';
  const fullHref = `/${locale}/events/${slug}/my-activities`;
  const count = insights.registeredCount;
  const nextRange = next?.time ? (next.endTime ? `${next.time} – ${next.endTime}` : next.time) : '';
  return (
    <section className={`${surface} border border-[var(--x-line)] p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold text-[var(--x-primary)]">
            {he ? 'הלוח שלי' : 'My schedule'}
          </h3>
          <p className="mt-0.5 text-xs text-[var(--x-soft)]">
            {he ? 'הפעילויות אליהן נרשמת' : 'The activities you registered for'}
          </p>
        </div>
        <span className="grid size-9 flex-none place-items-center rounded-full bg-[var(--x-primary-wash)] text-[var(--x-primary)]">
          <IconCalendar className="size-4" />
        </span>
      </div>

      <p className="mt-4 text-center">
        <span className="block font-display text-4xl font-extrabold tabular-nums text-[var(--x-primary)]">
          {count}
        </span>
        <span className="block text-sm text-[var(--x-soft)]">
          {he ? (count === 1 ? 'פעילות' : 'פעילויות') : count === 1 ? 'activity' : 'activities'}
        </span>
      </p>

      <Link
        href={fullHref}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[var(--x-r-field)] border border-[var(--x-primary)]/30 bg-[var(--x-primary-wash)] px-4 py-2.5 text-sm font-semibold text-[var(--x-primary)] transition-colors hover:bg-[var(--x-primary)]/15"
      >
        <IconCalendar className="size-4" />
        {he ? 'הצג לוח מלא' : 'Show the full schedule'}
      </Link>

      {next ? (
        <div className="mt-5 border-t border-[var(--x-line)] pt-4">
          <h4 className="font-display text-sm font-bold text-[var(--x-ink)]">
            {he ? 'הפעילות הבאה' : 'Next activity'}
          </h4>
          <button
            type="button"
            onClick={() => onJump?.(next.dayKey, next.id)}
            className="mt-2.5 flex w-full items-center gap-3 rounded-[var(--x-r-field)] border border-[var(--x-line)] px-3.5 py-3 text-start transition-colors hover:border-[var(--x-primary)]/45 hover:bg-[var(--x-raise)]"
          >
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-xs text-[var(--x-soft)]">
                <span>{next.dateShort}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums" dir="ltr">{nextRange}</span>
              </span>
              <span className="mt-0.5 block text-sm font-semibold leading-snug text-[var(--x-ink)]">
                {next.title}
              </span>
              {next.place ? (
                <span className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--x-soft)]">
                  <IconPin className="size-3.5 text-[var(--x-faint)]" />
                  {next.place}
                </span>
              ) : null}
            </span>
            {next.speakers[0] ? (
              <Avatar name={next.speakers[0].name} url={next.speakers[0].photoUrl} size={40} ring={false} />
            ) : null}
            <IconChevronLeft className="size-4 flex-none text-[var(--x-faint)] ltr:-scale-x-100" />
          </button>
        </div>
      ) : null}

      <div className="mt-5 border-t border-[var(--x-line)] pt-4">
        <h4 className="font-display text-sm font-bold text-[var(--x-ink)]">
          {he ? 'היום בתמצית' : 'The day in brief'}
        </h4>
        {items.length === 0 ? (
          <p className="mt-2.5 rounded-[var(--x-r-field)] border border-dashed border-[var(--x-line)] px-4 py-4 text-center text-xs text-[var(--x-faint)]">
            {he ? 'עדיין לא הוספת פעילויות ללוח שלך.' : 'You haven’t added any activities yet.'}
          </p>
        ) : (
          <ol className="relative mt-2.5 flex flex-col">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-4 top-4 start-[5px] w-px bg-[var(--x-line-strong)]"
            />
            {items.slice(0, 6).map((item) => (
              <li key={item.id} className="relative">
                <button
                  type="button"
                  onClick={() => onJump?.(item.dayKey, item.id)}
                  className="flex w-full items-start gap-3 rounded-[var(--x-r-field)] py-2 pe-1 text-start transition-colors hover:bg-[var(--x-raise)]"
                >
                  <span className="mt-1.5 size-[11px] flex-none rounded-full bg-[var(--x-primary)] ring-4 ring-[var(--x-surface)]" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium leading-snug text-[var(--x-ink)]">
                      {item.title}
                    </span>
                    <span className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--x-soft)]">
                      <span>{item.dateShort}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums" dir="ltr">{item.time}</span>
                      {item.room ? (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{item.room}</span>
                        </>
                      ) : null}
                    </span>
                  </span>
                  <IconChevronLeft className="mt-1 size-4 flex-none text-[var(--x-faint)] ltr:-scale-x-100" />
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>

      <Link
        href={fullHref}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[var(--x-r-field)] bg-[var(--x-primary)] px-4 py-3 text-sm font-semibold text-[var(--x-primary-ink)] transition-colors hover:bg-[var(--x-primary-strong)]"
      >
        <IconCalendar className="size-4" />
        {he ? 'לכל הפעילויות שלי' : 'All my activities'}
      </Link>

      <div
        className={`mt-4 rounded-[var(--x-r-field)] px-4 py-3 ${
          conflicts > 0 ? 'bg-[var(--x-wait-wash)]' : 'bg-[var(--x-ok-wash)]'
        }`}
      >
        <p className={`flex items-center gap-2 text-sm font-semibold ${conflicts > 0 ? 'text-[var(--x-wait)]' : 'text-[var(--x-ok)]'}`}>
          {conflicts > 0 ? <IconWarn className="size-4" /> : <IconCheck className="size-4" />}
          {conflicts > 0
            ? he
              ? conflicts === 1 ? 'התנגשות אחת' : `${conflicts} התנגשויות`
              : conflicts === 1 ? 'One conflict' : `${conflicts} conflicts`
            : he
              ? 'אין התנגשויות'
              : 'No conflicts'}
        </p>
        <p className="mt-0.5 text-xs text-[var(--x-soft)]">
          {conflicts > 0
            ? he ? 'שתי פעילויות שלך באותה שעה.' : 'Two of your activities share an hour.'
            : he ? 'הלוח שלך מעודכן' : 'Your schedule is up to date'}
        </p>
      </div>
    </section>
  );
};

/* Kept for reuse elsewhere; the program sidebar now shows insights. */
export const MiniCalendar = ({
  days,
  active,
  onSelect,
  locale,
}: {
  days: { key: string; index: number }[];
  active: string;
  onSelect: (key: string) => void;
  locale: Locale;
}) => {
  void days;
  void active;
  void onSelect;
  void locale;
  return null;
};
