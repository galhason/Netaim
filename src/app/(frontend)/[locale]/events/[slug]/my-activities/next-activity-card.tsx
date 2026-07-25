'use client';

import type { Locale } from '@/config/locales';
import {
  IconArrow,
  IconPin,
  IconUsers,
  IconWait,
  type ActivityVM,
} from '@/features/conference';
import { mapDirectionsUrl } from './calendar-links';

interface Props {
  activity: ActivityVM | null;
  locale: Locale;
  onOpen: (id: string) => void;
  venue?: string;
  programHref: string;
}

const primaryBtn =
  'inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-[var(--x-r-pill)] bg-white px-4 text-sm font-semibold text-[var(--x-navy-deep)] transition-transform hover:scale-[1.02] hover:bg-[var(--x-primary-wash)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

const ghostBtn =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[var(--x-r-pill)] border border-white/25 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

/*
 * The boarding pass. One card on the page is allowed to shout, and this is
 * it: everything a participant needs in the ninety seconds before they
 * stand up — when it starts, what it is, which room, who is speaking, and
 * the two things they might do about it. Navy marks it as the moment; the
 * rest of the dashboard stays in daylight so this reads as the single next
 * step.
 */
const NextActivityCard = ({
  activity,
  locale,
  onOpen,
  venue,
  programHref,
}: Props) => {
  const he = locale === 'he';

  if (!activity) {
    return (
      <div className="rounded-[var(--x-r-card)] border border-dashed border-[var(--x-line-strong)] bg-[var(--x-surface)] p-6 text-center shadow-[var(--x-shadow)]">
        <span className="mx-auto grid size-11 place-items-center rounded-full bg-[var(--x-primary-wash)] text-[var(--x-primary)]">
          <IconWait className="size-5" />
        </span>
        <p className="mt-3 text-sm font-semibold text-[var(--x-ink)]">
          {he ? 'אין פעילות הבאה בתור' : 'Nothing up next'}
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-[var(--x-soft)]">
          {he
            ? 'סיימת להיום. אפשר להציץ בתוכנייה ולהוסיף עוד משהו.'
            : 'You are done for now. Browse the program to add something.'}
        </p>
        <a
          href={programHref}
          className="mt-4 inline-flex min-h-[42px] items-center gap-2 rounded-[var(--x-r-pill)] bg-[var(--x-primary)] px-5 text-[13px] font-semibold text-[var(--x-primary-ink)] transition-colors hover:bg-[var(--x-primary-strong)]"
        >
          {he ? 'לתוכנייה' : 'Browse the program'}
          <IconArrow className="size-4 rtl:rotate-180" />
        </a>
      </div>
    );
  }

  const speakers = activity.speakers.map((s) => s.name).join(' · ');
  const directions = mapDirectionsUrl(activity, venue);
  const waiting = activity.registration === 'waitlist';

  return (
    <article className="relative overflow-hidden rounded-[var(--x-r-card)] bg-[var(--x-navy)] text-white shadow-[var(--x-shadow-lift)]">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(130%_150%_at_100%_0%,rgba(110,86,207,0.5),transparent_55%),radial-gradient(90%_130%_at_0%_100%,rgba(43,58,110,0.7),transparent_60%),linear-gradient(135deg,#16233c,#0a1322)]"
      />
      {/* The two notches that make a ticket a ticket. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -start-2.5 top-[168px] size-5 rounded-full bg-[var(--x-bg)]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -end-2.5 top-[168px] size-5 rounded-full bg-[var(--x-bg)]"
      />

      <div className="relative p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--x-gold-soft)]">
            {he ? 'הפעילות הבאה' : 'Up next'}
          </p>
          <span className="rounded-[var(--x-r-pill)] bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/70">
            {activity.typeLabel}
          </span>
        </div>

        <div className="mt-4 flex items-end gap-2">
          <span className="font-display text-5xl font-extrabold leading-none tabular-nums text-white sm:text-6xl">
            {activity.time}
          </span>
          {activity.endTime ? (
            <span className="pb-1 text-sm font-semibold tabular-nums text-white/65">
              {he ? `עד ${activity.endTime}` : `until ${activity.endTime}`}
            </span>
          ) : null}
        </div>
        {activity.duration ? (
          <p className="mt-1.5 text-[12px] text-white/45">{activity.duration}</p>
        ) : null}

        <div
          aria-hidden="true"
          className="mt-5 border-t border-dashed border-white/15"
        />

        <h3 className="mt-4 font-display text-xl font-bold leading-snug tracking-tight sm:text-2xl">
          {activity.title}
        </h3>

        <dl className="mt-3 flex flex-col gap-1.5 text-[13px] text-white/70">
          {activity.room ? (
            <div className="flex items-center gap-2">
              <IconPin className="size-4 shrink-0 text-white/45" />
              <span>
                {activity.room}
                {activity.floor ? ` · ${activity.floor}` : ''}
              </span>
            </div>
          ) : null}
          {speakers ? (
            <div className="flex items-center gap-2">
              <IconUsers className="size-4 shrink-0 text-white/45" />
              <span className="truncate">{speakers}</span>
            </div>
          ) : null}
          {waiting ? (
            <div className="flex items-center gap-2 text-[var(--x-gold-soft)]">
              <IconWait className="size-4 shrink-0" />
              <span>{he ? 'אתה ברשימת המתנה' : 'You are on the waiting list'}</span>
            </div>
          ) : null}
        </dl>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            className={primaryBtn}
            onClick={() => onOpen(activity.id)}
          >
            {he ? 'פרטי הפעילות' : 'Open activity'}
            <IconArrow className="size-4 rtl:rotate-180" />
          </button>
          {directions ? (
            <a
              href={directions}
              target="_blank"
              rel="noreferrer"
              className={ghostBtn}
            >
              <IconPin className="size-4" />
              {he ? 'ניווט לחדר' : 'Directions'}
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
};

export default NextActivityCard;
