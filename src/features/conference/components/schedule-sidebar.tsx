'use client';

import type { Locale } from '@/config/locales';
import type { ProgramInsights, ScheduleItemVM } from '../types';
import { GhostLink, surface } from '../ui/kit';
import { IconArrow, IconCheck, IconClock } from '../ui/icons';

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
