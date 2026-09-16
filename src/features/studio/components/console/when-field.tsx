'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { Locale } from '@/config/locales';

/*
 * Choosing when something happens.
 *
 * The browser's own `datetime-local` is one control doing two jobs, and
 * it does both grudgingly: the calendar hides behind a small icon, the
 * segments are typed in the browser's locale rather than the page's, and
 * in a right-to-left form the whole thing reads backwards. Worse, the
 * end of an activity had to be typed out in full — the same date again,
 * every single time, for something that almost always ends on the day it
 * began.
 *
 * So: a month at a glance, a time beside it, and an end that follows the
 * start unless it is told otherwise. The value posted is still a plain
 * `datetime-local` string in a hidden input, so every server action that
 * reads these forms is untouched.
 */
interface WhenFieldProps {
  name: string;
  label: string;
  locale: Locale;
  /* `YYYY-MM-DDTHH:mm`, as `datetime-local` produces. */
  defaultValue?: string;
  /*
   * The field this one follows. When that field takes a date and this
   * one is empty — or sits on a different day — this one moves to the
   * same day and keeps its own time. Only the end time is ever typed.
   */
  follows?: string;
  /* The time to offer when this field is filled from the one it follows. */
  offsetMinutes?: number;
}

const MONTHS: Record<Locale, string[]> = {
  he: [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
  ],
  en: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ],
};

const WEEKDAYS: Record<Locale, string[]> = {
  he: ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'],
  en: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
};

const COPY = {
  he: { pick: 'בחירת תאריך', clear: 'ניקוי', today: 'היום', time: 'שעה', empty: 'לא נקבע' },
  en: { pick: 'Pick a date', clear: 'Clear', today: 'Today', time: 'Time', empty: 'Not set' },
} as const;

const pad = (value: number): string => String(value).padStart(2, '0');

const splitValue = (value: string): { day: string; time: string } => {
  const [day = '', time = ''] = value.split('T');
  return { day, time: time.slice(0, 5) };
};

const joinValue = (day: string, time: string): string =>
  day ? `${day}T${time || '09:00'}` : '';

const startOfMonth = (day: string): { year: number; month: number } => {
  const parsed = /^(\d{4})-(\d{2})/.exec(day);
  if (parsed) {
    return { year: Number(parsed[1]), month: Number(parsed[2]) - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
};

const gridOf = (year: number, month: number): (string | null)[] => {
  const first = new Date(Date.UTC(year, month, 1));
  const lead = first.getUTCDay();
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= days; d += 1) {
    cells.push(`${year}-${pad(month + 1)}-${pad(d)}`);
  }
  return cells;
};

const readable = (value: string, locale: Locale): string => {
  const { day, time } = splitValue(value);
  if (!day) {
    return COPY[locale].empty;
  }
  const [year, month, date] = day.split('-');
  const monthName = MONTHS[locale][Number(month) - 1] ?? month;
  return `${Number(date)} ${monthName} ${year}${time ? ` · ${time}` : ''}`;
};

const WhenField = ({
  name,
  label,
  locale,
  defaultValue = '',
  follows,
  offsetMinutes = 60,
}: WhenFieldProps) => {
  const inputId = useId();
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const { day, time } = splitValue(value);
  const [view, setView] = useState(() => startOfMonth(day));
  const box = useRef<HTMLDivElement | null>(null);
  const t = COPY[locale];

  /*
   * Following the other field. Watched through the DOM rather than
   * through shared state because these two live inside a plain form
   * that other code also writes to — the wizard restores a draft, and a
   * browser restores a submitted form on the back button.
   */
  useEffect(() => {
    if (!follows) {
      return undefined;
    }
    const source = document.querySelector<HTMLInputElement>(
      `input[name="${follows}"]`,
    );
    if (!source) {
      return undefined;
    }
    const onChange = () => {
      const from = splitValue(source.value);
      if (!from.day) {
        return;
      }
      setValue((held) => {
        const mine = splitValue(held);
        if (mine.day === from.day) {
          return held;
        }
        /*
         * An empty end gets the start's day and an hour later; an end
         * that was already set keeps its own time and only moves day.
         * Either way the organiser types a time, never a date twice.
         */
        if (!mine.time) {
          const [hour = '9', minute = '0'] = from.time.split(':');
          const total = Number(hour) * 60 + Number(minute) + offsetMinutes;
          const rolled = total % (24 * 60);
          return joinValue(from.day, `${pad(Math.floor(rolled / 60))}:${pad(rolled % 60)}`);
        }
        return joinValue(from.day, mine.time);
      });
    };
    source.addEventListener('change', onChange);
    return () => source.removeEventListener('change', onChange);
  }, [follows, offsetMinutes]);

  /* A click anywhere else closes the month. */
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onDown = (event: MouseEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  /*
   * The hidden input is the field as far as the form is concerned. A
   * `change` event is dispatched on every write so the field that
   * follows this one hears it.
   */
  const hidden = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    const element = hidden.current;
    if (element && element.value !== value) {
      element.value = value;
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, [value]);

  const cells = gridOf(view.year, view.month);
  const today = `${new Date().getFullYear()}-${pad(new Date().getMonth() + 1)}-${pad(new Date().getDate())}`;

  const move = (by: number) => {
    const next = new Date(Date.UTC(view.year, view.month + by, 1));
    setView({ year: next.getUTCFullYear(), month: next.getUTCMonth() });
  };

  return (
    <div className="block" ref={box}>
      <span className="mb-1.5 block text-[10px] font-medium tracking-[0.16em] text-[var(--c-text-faint)]">
        {label}
      </span>
      <input ref={hidden} type="hidden" name={name} defaultValue={defaultValue} />

      <div className="flex items-stretch gap-2">
        <button
          type="button"
          id={inputId}
          onClick={() => {
            setView(startOfMonth(day || today));
            setOpen((held) => !held);
          }}
          aria-expanded={open}
          className={`flex flex-1 items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-start text-sm transition-colors ${
            open
              ? 'border-[var(--c-bronze)]/60 bg-[rgba(6,10,16,0.6)] text-[var(--c-text)]'
              : 'border-[var(--c-line)] bg-[rgba(6,10,16,0.6)] text-[var(--c-text)] hover:border-[var(--c-bronze)]/40'
          }`}
        >
          <span className={day ? '' : 'text-[var(--c-text-faint)]'}>
            {readable(value, locale)}
          </span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true" className="flex-none text-[var(--c-text-faint)]">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M8 3v4M16 3v4M3 10h18" />
          </svg>
        </button>

        <input
          type="time"
          value={time}
          aria-label={t.time}
          onChange={(event) =>
            setValue(joinValue(day || today, event.target.value))
          }
          className="w-28 rounded-lg border border-[var(--c-line)] bg-[rgba(6,10,16,0.6)] px-2 py-2.5 text-sm text-[var(--c-text)] transition-colors focus:border-[var(--c-bronze)]/60 focus:outline-none"
        />
      </div>

      {open ? (
        <div className="relative">
          <div className="absolute z-40 mt-2 w-[17.5rem] rounded-xl border border-[var(--c-line-strong)] bg-[var(--c-deep)] p-3 shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => move(-1)}
                aria-label="←"
                className="grid size-7 place-items-center rounded-md text-[var(--c-text-soft)] transition-colors hover:bg-white/5 hover:text-[var(--c-text)]"
              >
                ‹
              </button>
              <span className="text-xs font-medium text-[var(--c-text)]">
                {MONTHS[locale][view.month]} {view.year}
              </span>
              <button
                type="button"
                onClick={() => move(1)}
                aria-label="→"
                className="grid size-7 place-items-center rounded-md text-[var(--c-text-soft)] transition-colors hover:bg-white/5 hover:text-[var(--c-text)]"
              >
                ›
              </button>
            </div>

            <div className="mt-2 grid grid-cols-7 gap-0.5 text-center">
              {WEEKDAYS[locale].map((weekday, index) => (
                <span
                  key={`${weekday}-${index}`}
                  className="py-1 text-[10px] text-[var(--c-text-faint)]"
                >
                  {weekday}
                </span>
              ))}
              {cells.map((cell, index) =>
                cell === null ? (
                  <span key={`gap-${index}`} />
                ) : (
                  <button
                    key={cell}
                    type="button"
                    onClick={() => {
                      setValue(joinValue(cell, time));
                      setOpen(false);
                    }}
                    className={`grid h-8 place-items-center rounded-md text-xs transition-colors ${
                      cell === day
                        ? 'bg-[var(--c-bronze)] font-semibold text-[#161006]'
                        : cell === today
                          ? 'text-[var(--c-bronze)] hover:bg-white/5'
                          : 'text-[var(--c-text-soft)] hover:bg-white/5 hover:text-[var(--c-text)]'
                    }`}
                  >
                    {Number(cell.slice(-2))}
                  </button>
                ),
              )}
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-[var(--c-line)] pt-2">
              <button
                type="button"
                onClick={() => {
                  setValue(joinValue(today, time));
                  setView(startOfMonth(today));
                }}
                className="rounded-md px-2 py-1 text-[11px] text-[var(--c-text-soft)] transition-colors hover:text-[var(--c-bronze)]"
              >
                {t.today}
              </button>
              <button
                type="button"
                onClick={() => {
                  setValue('');
                  setOpen(false);
                }}
                className="rounded-md px-2 py-1 text-[11px] text-[var(--c-text-soft)] transition-colors hover:text-[#E39A8B]"
              >
                {t.clear}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default WhenField;
