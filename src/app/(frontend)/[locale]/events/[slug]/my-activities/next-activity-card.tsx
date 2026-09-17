'use client';

import type { Locale } from '@/config/locales';
import {
  IconArrow,
  IconClock,
  IconPin,
  IconUsers,
  IconWait,
} from '@/features/conference';
import { mapDirectionsUrl } from './calendar-links';
import { t } from './copy';
import { MINUTE, spanText, titleOf, type TimelineItem } from './timeline';

interface Props {
  /* What is happening now, if anything; otherwise what comes next. */
  current: TimelineItem | null;
  next: TimelineItem | null;
  /* Whether today is a day of the conference — decides the empty wording. */
  todayIsConferenceDay: boolean;
  now: number | null;
  /* Whether the shown activity is held as a waiting-list place. */
  waiting: boolean;
  locale: Locale;
  venue?: string;
  programHref: string;
  networkingHref: string;
  onOpen: (id: string) => void;
}

const Sparkle = ({ className = 'size-5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M12 2.5c.6 3.9 2.6 5.9 6.5 6.5-3.9.6-5.9 2.6-6.5 6.5-.6-3.9-2.6-5.9-6.5-6.5 3.9-.6 5.9-2.6 6.5-6.5ZM5 14c.3 1.9 1.3 2.9 3.2 3.2-1.9.3-2.9 1.3-3.2 3.2-.3-1.9-1.3-2.9-3.2-3.2 1.9-.3 2.9-1.3 3.2-3.2Z" />
  </svg>
);

/*
 * The one card on the page that is allowed to lead.
 *
 * It answers the question a participant standing in a corridor actually
 * has — what next, where, in how long — and it reads the clock rather
 * than the schedule: a session in progress beats the one after it, and
 * a countdown is computed from the moment of render, never typed in.
 * The clock is the dashboard's, ticking every half minute, so this card
 * and the timeline's NOW line never disagree.
 */
const NextActivityCard = ({
  current,
  next,
  todayIsConferenceDay,
  now,
  waiting,
  locale,
  venue,
  programHref,
  networkingHref,
  onOpen,
}: Props) => {
  const he = locale === 'he';
  const item = current ?? next;

  /* ---- nothing ahead ---- */
  if (!item || now === null) {
    if (now === null) {
      /* Before the clock is read on the client, keep the card's height without a claim. */
      return <div aria-hidden="true" className="min-h-[164px] rounded-[var(--x-r-card)] border border-[var(--x-line)] bg-[var(--x-surface)]" />;
    }
    return (
      <section className="rounded-[var(--x-r-card)] border border-dashed border-[var(--x-line-strong)] bg-[var(--x-surface)] p-5 text-center sm:p-6">
        <span className="mx-auto grid size-11 place-items-center rounded-full bg-[var(--x-primary-wash)] text-[var(--x-primary)]">
          <IconClock className="size-5" />
        </span>
        <p className="mt-3 font-display text-[16px] font-bold text-[var(--x-ink)]">
          {todayIsConferenceDay ? t(locale, 'noMoreToday') : t(locale, 'nothingAhead')}
        </p>
        <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-[var(--x-soft)]">
          {todayIsConferenceDay ? t(locale, 'noMoreTodayHint') : t(locale, 'nothingAheadHint')}
        </p>
        <a
          href={programHref}
          className="mt-4 inline-flex min-h-[42px] items-center gap-2 rounded-[var(--x-r-pill)] bg-[var(--x-primary)] px-5 text-[13px] font-semibold text-[var(--x-primary-ink)] transition-colors hover:bg-[var(--x-primary-strong)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--x-ring)]"
        >
          {t(locale, 'toProgram')}
          <IconArrow className="size-4 rtl:rotate-180" />
        </a>
      </section>
    );
  }

  const isNow = Boolean(current);
  const left = isNow ? item.endMs - now : item.startMs - now;
  const countdownLabel = isNow ? t(locale, 'endsIn') : t(locale, 'startsIn');
  const countdown =
    !isNow && left < MINUTE ? t(locale, 'startingNow') : spanText(left, he);

  const activity = item.kind === 'activity' ? item.activity : null;
  const meeting = item.kind === 'meeting' ? item.meeting : null;
  const time = activity ? activity.time : meeting?.time;
  const endTime = activity ? activity.endTime : meeting?.endTime;
  const place = activity
    ? [activity.room, activity.floor].filter(Boolean).join(' · ')
    : (meeting?.location ?? '');
  const people = activity
    ? activity.speakers.map((s) => s.name).join(', ')
    : (meeting?.withName ?? '');
  const image = activity?.image;
  const directions = activity ? mapDirectionsUrl(activity, venue) : null;

  return (
    <section
      aria-labelledby="next-activity-title"
      className={`relative overflow-hidden rounded-[var(--x-r-card)] border p-4 sm:p-5 ${
        isNow
          ? 'border-[var(--x-primary)]/40 bg-[var(--x-primary-wash)] shadow-[0_10px_30px_rgba(110,86,207,0.14)]'
          : 'border-[var(--x-line)] bg-[linear-gradient(135deg,var(--x-primary-wash),var(--x-surface)_55%)] shadow-[var(--x-shadow)]'
      }`}
    >
      <h2
        id="next-activity-title"
        className="flex items-center gap-2 text-[13px] font-bold text-[var(--x-primary-strong)]"
      >
        <Sparkle className="size-5 text-[var(--x-primary)]" />
        {isNow ? t(locale, 'nowTitle') : t(locale, 'nextTitle')}
      </h2>

      <div className="mt-3 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="flex min-w-0 items-start gap-4">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element -- session artwork from the media API
            <img
              src={image}
              alt=""
              className="hidden size-[92px] shrink-0 rounded-[12px] object-cover sm:block"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold tabular-nums text-[var(--x-soft)]" dir="ltr">
              {time}
              {endTime ? ` – ${endTime}` : ''}
            </p>
            <p className="mt-1 font-display text-[19px] font-bold leading-snug tracking-tight text-[var(--x-ink)] sm:text-[21px]">
              {titleOf(item)}
            </p>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[var(--x-soft)]">
              {place ? (
                <span className="inline-flex items-center gap-1.5">
                  <IconPin className="size-4 text-[var(--x-faint)]" />
                  {place}
                </span>
              ) : null}
              {people ? (
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <IconUsers className="size-4 shrink-0 text-[var(--x-faint)]" />
                  <span className="truncate">{people}</span>
                </span>
              ) : null}
              {waiting ? (
                <span className="inline-flex items-center gap-1.5 text-[var(--x-wait)]">
                  <IconWait className="size-4" />
                  {t(locale, 'onWaitlist')}
                </span>
              ) : null}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--x-surface)] text-[var(--x-primary)] shadow-[var(--x-shadow)]">
              <IconClock className="size-5" />
            </span>
            <span className="flex flex-wrap items-baseline gap-x-1.5 leading-tight sm:block">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] rtl:tracking-normal text-[var(--x-soft)]">
                {countdownLabel}
              </span>
              <span
                aria-live="polite"
                className="block font-display text-[19px] font-extrabold tabular-nums text-[var(--x-primary-strong)]"
              >
                {countdown}
              </span>
            </span>
          </div>
          <div className="ms-auto flex flex-wrap items-center gap-2 sm:ms-0">
            {activity ? (
              <button
                type="button"
                onClick={() => onOpen(activity.id)}
                className="inline-flex min-h-[42px] items-center gap-2 whitespace-nowrap rounded-[var(--x-r-pill)] border border-[var(--x-primary)]/40 bg-[var(--x-surface)] px-4 text-[13px] font-semibold text-[var(--x-primary)] transition-colors hover:bg-[var(--x-primary)] hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--x-ring)]"
              >
                {t(locale, 'viewActivity')}
                <IconArrow className="size-4 rtl:rotate-180" />
              </button>
            ) : (
              <a
                href={networkingHref}
                className="inline-flex min-h-[42px] items-center gap-2 whitespace-nowrap rounded-[var(--x-r-pill)] border border-[var(--x-primary)]/40 bg-[var(--x-surface)] px-4 text-[13px] font-semibold text-[var(--x-primary)] transition-colors hover:bg-[var(--x-primary)] hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--x-ring)]"
              >
                {t(locale, 'toNetworking')}
                <IconArrow className="size-4 rtl:rotate-180" />
              </a>
            )}
            {directions ? (
              <a
                href={directions}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[42px] items-center gap-1.5 rounded-[var(--x-r-pill)] px-3 text-[13px] font-medium text-[var(--x-soft)] transition-colors hover:text-[var(--x-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--x-ring)]"
              >
                <IconPin className="size-4" />
                {t(locale, 'directions')}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
};

export default NextActivityCard;
