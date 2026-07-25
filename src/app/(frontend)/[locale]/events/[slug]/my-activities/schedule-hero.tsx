'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { Locale } from '@/config/locales';
import { IconArrow, IconClock } from '@/features/conference';

export interface HeroStateVM {
  next: { startMs: number; title: string } | null;
  current: { title: string; endMs: number } | null;
  todayTotal: number;
  allDone: boolean;
}

interface Props {
  locale: Locale;
  eventTitle: string;
  title: string;
  subtitle: string;
  programHref: string;
  programLabel: string;
  dayKeys: string[];
  todayKey: string;
  state: HeroStateVM;
}

const MINUTE = 60000;
const HOUR = 3600000;
const DAY = 86400000;

const pad = (n: number): string => String(n).padStart(2, '0');

/*
 * Eight motes of light, placed by hand rather than by chance — a random
 * scatter would differ between the server render and the browser's, and
 * the participant would see the sky twitch on hydration.
 */
const PARTICLES: { top: string; start: string; size: number; dim: string }[] = [
  { top: '18%', start: '12%', size: 4, dim: 'bg-white/25' },
  { top: '62%', start: '7%', size: 3, dim: 'bg-white/15' },
  { top: '32%', start: '31%', size: 2, dim: 'bg-white/20' },
  { top: '78%', start: '26%', size: 5, dim: 'bg-[var(--x-gold-soft)]/25' },
  { top: '12%', start: '58%', size: 3, dim: 'bg-white/20' },
  { top: '48%', start: '72%', size: 2, dim: 'bg-white/25' },
  { top: '84%', start: '64%', size: 4, dim: 'bg-[var(--x-gold-soft)]/20' },
  { top: '26%', start: '88%', size: 3, dim: 'bg-white/15' },
];

/*
 * The distance to the next thing, said the way a person would say it:
 * minutes while it is close, hours and minutes while it is not, and a
 * plain "now" the moment it begins.
 */
const spanText = (ms: number, he: boolean): string => {
  const mins = Math.max(0, Math.round(ms / MINUTE));
  if (mins < 60) return he ? `${mins} דקות` : `${mins} min`;
  const hours = Math.floor(ms / HOUR);
  const rest = Math.round((ms - hours * HOUR) / MINUTE);
  if (he) {
    return rest > 0 ? `${hours} שעות ו־${rest} דקות` : `${hours} שעות`;
  }
  return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
};

/*
 * What the conference itself is doing today — counted from the day keys
 * the program already knows about, so the hero never claims a day that
 * does not exist.
 */
const conferenceStatus = (
  dayKeys: string[],
  todayKey: string,
  he: boolean,
): string => {
  const first = dayKeys[0];
  const last = dayKeys[dayKeys.length - 1];
  if (!first || !last) return he ? 'הכנס' : 'The conference';
  if (todayKey < first) {
    const days = Math.max(
      1,
      Math.round(
        (new Date(`${first}T00:00:00`).getTime() -
          new Date(`${todayKey}T00:00:00`).getTime()) /
          DAY,
      ),
    );
    return he
      ? days === 1
        ? 'הכנס מתחיל מחר'
        : `הכנס מתחיל בעוד ${days} ימים`
      : days === 1
        ? 'The conference starts tomorrow'
        : `The conference starts in ${days} days`;
  }
  if (todayKey > last) {
    return he ? 'הכנס הסתיים' : 'The conference has ended';
  }
  const index = dayKeys.indexOf(todayKey);
  if (index < 0) return he ? 'הכנס מתקיים בימים אלה' : 'The conference is running';
  return he
    ? `יום ${index + 1} מתוך ${dayKeys.length}`
    : `Day ${index + 1} of ${dayKeys.length}`;
};

/*
 * The one sentence the page exists to say. It reads the clock before it
 * reads the schedule: inside an activity beats about to start, which beats
 * finished, which beats an empty day. Anything else is just the time of
 * the next thing.
 */
const intelligence = (
  state: HeroStateVM,
  now: number,
  he: boolean,
): { text: string; tone: 'live' | 'soon' | 'done' | 'calm' } => {
  if (state.current) {
    return {
      tone: 'live',
      text: he
        ? `אתה נמצא כרגע בפעילות — ${state.current.title}.`
        : `You are in a session right now — ${state.current.title}.`,
    };
  }
  if (state.next) {
    const left = state.next.startMs - now;
    if (left <= 60 * MINUTE) {
      return {
        tone: 'soon',
        text: he
          ? `בעוד ${spanText(left, true)} מתחילה הפעילות הבאה.`
          : `Your next activity starts in ${spanText(left, false)}.`,
      };
    }
    return {
      tone: 'calm',
      text: he
        ? `הפעילות הבאה שלך בעוד ${spanText(left, true)}.`
        : `Your next activity is ${spanText(left, false)} away.`,
    };
  }
  if (state.allDone) {
    return {
      tone: 'done',
      text: he
        ? 'כל הכבוד! השלמת את כל הפעילויות שלך.'
        : 'Nicely done — you have completed every activity on your list.',
    };
  }
  if (state.todayTotal === 0) {
    return {
      tone: 'calm',
      text: he
        ? 'יש לך יום פנוי. אולי זה הזמן להוסיף משהו מהתוכנייה.'
        : 'You have a free day. A good moment to add something from the program.',
    };
  }
  return {
    tone: 'calm',
    text: he ? 'היום שלך מוכן.' : 'Your day is ready.',
  };
};

const TONE_DOT: Record<string, string> = {
  live: 'bg-[var(--x-live)]',
  soon: 'bg-[var(--x-gold-soft)]',
  done: 'bg-[var(--x-ok)]',
  calm: 'bg-white/50',
};

/*
 * One panel opens the page: the clock, the day, and the single sentence
 * that answers "what do I need right now?". It replaces the old split of
 * a title on one side and a clock card on the other — a participant
 * standing in a corridor reads one thing, not two.
 */
const ScheduleHero = ({
  locale,
  eventTitle,
  title,
  subtitle,
  programHref,
  programLabel,
  dayKeys,
  todayKey,
  state,
}: Props) => {
  const he = locale === 'he';
  const reduce = useReducedMotion();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const date = now === null ? null : new Date(now);
  const time = date ? `${pad(date.getHours())}:${pad(date.getMinutes())}` : '—:—';
  const seconds = date ? pad(date.getSeconds()) : '––';
  const dateLine = date
    ? new Intl.DateTimeFormat(he ? 'he-IL' : 'en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(date)
    : ' ';

  const status = conferenceStatus(dayKeys, todayKey, he);
  const smart = now === null ? null : intelligence(state, now, he);

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-[calc(var(--x-r-card)+6px)] bg-[var(--x-navy)] text-white shadow-[var(--x-shadow-lift)]"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_140%_at_100%_0%,rgba(110,86,207,0.40),transparent_58%),radial-gradient(90%_120%_at_0%_100%,rgba(194,160,90,0.14),transparent_62%),linear-gradient(140deg,#111e35,#080f1c)]"
      />
      <span aria-hidden="true" className="pointer-events-none absolute inset-0">
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className={`absolute rounded-full ${p.dim}`}
            style={{
              top: p.top,
              insetInlineStart: p.start,
              width: p.size,
              height: p.size,
            }}
          />
        ))}
      </span>

      <div className="relative grid gap-6 p-6 sm:p-8 md:grid-cols-[minmax(0,1fr)_300px] md:items-center md:gap-10 md:p-10">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--x-gold-soft)]">
            {eventTitle}
          </p>
          <h1 className="mt-3 font-display text-[2rem] font-extrabold leading-[1.1] tracking-tight sm:text-4xl md:text-[2.85rem]">
            {title}
          </h1>
          <p className="mt-2.5 max-w-md text-[15px] leading-relaxed text-white/65">
            {subtitle}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <a
              href={programHref}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-[var(--x-r-pill)] bg-white px-5 text-sm font-semibold text-[var(--x-navy-deep)] transition-transform hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {programLabel}
              <IconArrow className="size-4 rtl:rotate-180" />
            </a>
            <span className="inline-flex min-h-[44px] items-center rounded-[var(--x-r-pill)] border border-white/15 px-4 text-[13px] font-medium text-white/70">
              {status}
            </span>
          </div>
        </div>

        <div className="rounded-[var(--x-r-card)] border border-white/12 bg-white/[0.07] p-5 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/50">
              {he ? 'עכשיו' : 'Right now'}
            </p>
            <IconClock className="size-5 text-white/35" />
          </div>
          {/*
           * A clock is read left to right in every language. Only the time
           * itself is pinned to LTR — the paragraph keeps the page's own
           * direction so it still sits against the right edge in Hebrew —
           * otherwise the smaller seconds flow to the left of the hour and
           * the time reads backwards.
           */}
          <p className="mt-2 font-display text-5xl font-extrabold tabular-nums tracking-tight">
            <span dir="ltr" className="inline-flex items-baseline gap-1">
              {time}
              <span className="text-lg font-semibold text-white/40">
                :{seconds}
              </span>
            </span>
          </p>
          <p className="mt-1 text-sm text-white/55">{dateLine}</p>

          <div className="mt-4 min-h-[52px] rounded-[var(--x-r-field)] bg-white/[0.06] px-3.5 py-3">
            {smart ? (
              <p className="flex items-start gap-2.5 text-[13px] font-medium leading-snug text-white/85">
                <span
                  aria-hidden="true"
                  className={`mt-1.5 size-2 shrink-0 rounded-full ${TONE_DOT[smart.tone] ?? 'bg-white/50'} ${
                    smart.tone === 'live' && !reduce ? 'x-live-dot' : ''
                  }`}
                />
                <span>{smart.text}</span>
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </motion.section>
  );
};

export default ScheduleHero;
