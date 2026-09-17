'use client';

import { useRef } from 'react';
import type { KeyboardEvent } from 'react';
import type { Locale } from '@/config/locales';
import { IconChevronLeft, IconChevronRight, type DayVM } from '@/features/conference';
import { dayOrdinal, t } from './copy';

interface Props {
  days: DayVM[];
  active: string;
  todayKey: string;
  /* How many saved activities each day holds — drawn as a small count. */
  counts: Record<string, number>;
  locale: Locale;
  onSelect: (key: string) => void;
}

/*
 * The day, written out the way a person would: "15 September", from the
 * key alone, in the page's own language.
 */
const longDay = (key: string, locale: Locale): string => {
  const date = new Date(`${key}T00:00:00`);
  if (Number.isNaN(date.getTime())) return key;
  return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-GB', {
    day: 'numeric',
    month: 'long',
  }).format(date);
};

/*
 * The conference's days, one tab each.
 *
 * A real tablist: the arrow keys move between days, Home and End jump to
 * the ends, and the active tab is announced as selected rather than only
 * painted lavender. The two chevrons at the side are the same movement
 * for a thumb — they follow the reading direction, so "next" is always
 * onward in the page's own language.
 */
const DaySelector = ({ days, active, todayKey, counts, locale, onSelect }: Props) => {
  const he = locale === 'he';
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(0, days.findIndex((day) => day.key === active));

  const go = (to: number) => {
    const day = days[to];
    if (!day) return;
    onSelect(day.key);
    tabs.current[to]?.focus();
  };

  const onKey = (event: KeyboardEvent<HTMLButtonElement>, i: number) => {
    /* In a right-to-left page the "forward" arrow is the left one. */
    const forward = he ? 'ArrowLeft' : 'ArrowRight';
    const backward = he ? 'ArrowRight' : 'ArrowLeft';
    if (event.key === forward) {
      event.preventDefault();
      go(Math.min(days.length - 1, i + 1));
    } else if (event.key === backward) {
      event.preventDefault();
      go(Math.max(0, i - 1));
    } else if (event.key === 'Home') {
      event.preventDefault();
      go(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      go(days.length - 1);
    }
  };

  const Prev = he ? IconChevronRight : IconChevronLeft;
  const Next = he ? IconChevronLeft : IconChevronRight;
  const arrow =
    'grid size-11 shrink-0 place-items-center rounded-full border border-[var(--x-line)] bg-[var(--x-surface)] text-[var(--x-soft)] transition-colors hover:border-[var(--x-line-strong)] hover:text-[var(--x-ink)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[var(--x-line)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--x-ring)]';

  return (
    <div className="flex items-center gap-3">
      <div
        role="tablist"
        aria-label={t(locale, 'days')}
        className="-mx-5 flex min-w-0 flex-1 snap-x gap-2 overflow-x-auto px-5 py-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {days.map((day, i) => {
          const on = day.key === active;
          const today = day.key === todayKey;
          const count = counts[day.key] ?? 0;
          return (
            <button
              key={day.key}
              ref={(node) => {
                tabs.current[i] = node;
              }}
              type="button"
              role="tab"
              id={`day-tab-${day.key}`}
              aria-selected={on}
              aria-controls="my-schedule-timeline"
              tabIndex={on ? 0 : -1}
              onClick={() => onSelect(day.key)}
              onKeyDown={(event) => onKey(event, i)}
              className={`relative flex min-h-[64px] min-w-[150px] shrink-0 snap-start flex-col justify-center rounded-[var(--x-r-card)] border px-4 py-2.5 text-start transition-[background-color,border-color,box-shadow] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--x-ring)] md:min-w-[168px] ${
                on
                  ? 'border-[var(--x-primary)]/40 bg-[var(--x-primary-wash)] shadow-[0_6px_18px_rgb(23 63 115 / 0.14)]'
                  : 'border-[var(--x-line)] bg-[var(--x-surface)] hover:border-[var(--x-line-strong)]'
              }`}
            >
              <span className="flex items-center gap-2">
                <span
                  className={`text-[15px] font-bold ${
                    on ? 'text-[var(--x-primary-strong)]' : 'text-[var(--x-ink)]'
                  }`}
                >
                  {t(locale, 'dayWord')} {dayOrdinal(day.index, locale)}
                </span>
                {today ? (
                  <span className="rounded-[var(--x-r-pill)] bg-[var(--x-ok-wash)] px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.1em] rtl:tracking-normal text-[var(--x-ok)]">
                    {t(locale, 'today')}
                  </span>
                ) : null}
                {count > 0 ? (
                  <span
                    aria-label={
                      he ? `${count} פעילויות` : `${count} activities`
                    }
                    className={`ms-auto grid min-w-[22px] place-items-center rounded-[var(--x-r-pill)] px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
                      on
                        ? 'bg-[var(--x-primary)] text-white'
                        : 'bg-[var(--x-raise)] text-[var(--x-soft)] ring-1 ring-inset ring-[var(--x-line)]'
                    }`}
                  >
                    {count}
                  </span>
                ) : null}
              </span>
              <span
                className={`mt-0.5 text-[13px] ${
                  on ? 'text-[var(--x-primary-strong)]/80' : 'text-[var(--x-soft)]'
                }`}
              >
                {longDay(day.key, locale)}
              </span>
            </button>
          );
        })}
      </div>

      {days.length > 1 ? (
        <div className="hidden shrink-0 items-center gap-2 md:flex">
          <button
            type="button"
            aria-label={t(locale, 'previousDay')}
            disabled={index === 0}
            onClick={() => go(index - 1)}
            className={arrow}
          >
            <Prev className="size-5" />
          </button>
          <button
            type="button"
            aria-label={t(locale, 'nextDay')}
            disabled={index >= days.length - 1}
            onClick={() => go(index + 1)}
            className={arrow}
          >
            <Next className="size-5" />
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default DaySelector;
