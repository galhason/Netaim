'use client';

import type { ReactNode } from 'react';
import type { Locale } from '@/config/locales';
import {
  IconArrow,
  IconBulb,
  IconCalendar,
  IconClock,
  type ActivityVM,
} from '@/features/conference';
import { Sprig } from './botanical';
import { googleCalendarUrl, outlookCalendarUrl } from './calendar-links';
import { t } from './copy';

export interface SummaryVM {
  saved: number;
  hours: number;
  days: number;
}

interface Props {
  locale: Locale;
  summary: SummaryVM;
  /* Two or three open activities close to what the participant chose. */
  suggestions: ActivityVM[];
  /* The next activity, for the calendar links; null keeps them away. */
  exportTarget: ActivityVM | null;
  programHref: string;
  onOpen: (id: string) => void;
}

const card =
  'rounded-[var(--x-r-card)] border border-[var(--x-line)] bg-[var(--x-surface)] shadow-[var(--x-shadow)]';

/*
 * One hour, one and a half, six — said briefly. Half hours are the only
 * fraction a conference schedule produces in practice; anything finer
 * rounds to them.
 */
const hoursText = (hours: number): string => {
  const rounded = Math.round(hours * 2) / 2;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};

const Stat = ({ value, label, icon }: { value: string; label: string; icon: ReactNode }) => (
  <li className="flex items-center gap-3 py-3">
    <span className="min-w-0 flex-1">
      <span className="block font-display text-[22px] font-extrabold leading-none tabular-nums text-[var(--x-ink)]">
        {value}
      </span>
      <span className="mt-1 block text-[13px] text-[var(--x-soft)]">{label}</span>
    </span>
    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--x-primary-wash)] text-[var(--x-primary)]">
      {icon}
    </span>
  </li>
);

const GoogleMark = () => (
  <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
    <path fill="#4285F4" d="M21.6 12.23c0-.7-.06-1.38-.18-2.03H12v3.84h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.89-1.74 2.98-4.3 2.98-7.33Z" />
    <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.44l-3.24-2.5c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.06v2.58A10 10 0 0 0 12 22Z" />
    <path fill="#FBBC05" d="M6.41 13.9a6 6 0 0 1 0-3.8V7.52H3.06a10 10 0 0 0 0 8.96l3.35-2.58Z" />
    <path fill="#EA4335" d="M12 5.98c1.47 0 2.79.5 3.83 1.5l2.87-2.87C16.95 2.99 14.7 2 12 2a10 10 0 0 0-8.94 5.52l3.35 2.58C7.2 7.74 9.4 5.98 12 5.98Z" />
  </svg>
);

const OutlookMark = () => (
  <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
    <path fill="#0364B8" d="M13 5h8v4.2l-8 3.4V5Z" />
    <path fill="#28A8EA" d="M13 12.6 21 9.2V19h-8v-6.4Z" />
    <rect x="2.5" y="4" width="11" height="16" rx="2" fill="#0F5FA8" />
    <path fill="#fff" d="M8 8.2c-1.7 0-2.9 1.6-2.9 3.8S6.3 15.8 8 15.8s2.9-1.6 2.9-3.8S9.7 8.2 8 8.2Zm0 1.5c.8 0 1.4.9 1.4 2.3S8.8 14.3 8 14.3s-1.4-.9-1.4-2.3S7.2 9.7 8 9.7Z" />
  </svg>
);

const exportBtn =
  'inline-flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-[var(--x-r-pill)] border border-[var(--x-line)] bg-[var(--x-surface)] px-3 text-[12.5px] font-semibold text-[var(--x-ink)] transition-colors hover:border-[var(--x-line-strong)] hover:bg-[var(--x-raise)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--x-ring)]';

/*
 * The supporting column.
 *
 * Three numbers, a door back to the programme, and the calendar. Lighter
 * than the timeline by design — the day is the page; this is the margin
 * beside it. Nothing here is a second schedule: the suggestions open the
 * same drawer the timeline opens, and joining one happens there.
 */
const ScheduleSidebar = ({
  locale,
  summary,
  suggestions,
  exportTarget,
  programHref,
  onOpen,
}: Props) => (
  <div className="flex flex-col gap-4">
    <section className={`${card} px-5 py-3`} aria-labelledby="summary-title">
      <h2
        id="summary-title"
        className="pt-2 font-display text-[16px] font-bold tracking-tight text-[var(--x-ink)]"
      >
        {t(locale, 'summary')}
      </h2>
      <ul className="mt-1 divide-y divide-[var(--x-line)]">
        <Stat
          value={String(summary.saved)}
          label={t(locale, 'savedActivities')}
          icon={<IconCalendar className="size-5" />}
        />
        <Stat
          value={hoursText(summary.hours)}
          label={t(locale, 'contentHours')}
          icon={<IconClock className="size-5" />}
        />
        <Stat
          value={String(summary.days)}
          label={t(locale, 'conferenceDays')}
          icon={<IconCalendar className="size-5" />}
        />
      </ul>
    </section>

    <section
      aria-labelledby="motto"
      className="relative overflow-hidden rounded-[var(--x-r-card)] bg-[var(--x-primary-wash)] px-5 py-7 text-center"
    >
      <Sprig className="mx-auto size-12" />
      <p id="motto" className="mt-4 font-display text-[16px] leading-relaxed text-[var(--x-primary-strong)]">
        <span className="block">{t(locale, 'mottoLine1')}</span>
        <span className="block italic">{t(locale, 'mottoLine2')}</span>
      </p>
    </section>

    <section className={`${card} p-5`} aria-labelledby="inspire-title">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="inspire-title" className="font-display text-[16px] font-bold tracking-tight text-[var(--x-ink)]">
            {t(locale, 'inspireTitle')}
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--x-soft)]">
            {t(locale, 'inspireBody')}
          </p>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--x-primary-wash)] text-[var(--x-primary)]">
          <IconBulb className="size-5" />
        </span>
      </div>

      {suggestions.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-2" aria-label={t(locale, 'suggested')}>
          {suggestions.map((activity) => (
            <li key={activity.id}>
              <button
                type="button"
                onClick={() => onOpen(activity.id)}
                className="flex w-full items-center gap-3 rounded-[var(--x-r-field)] border border-[var(--x-line)] px-3 py-2.5 text-start transition-colors hover:border-[var(--x-primary)]/40 hover:bg-[var(--x-primary-wash)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--x-ring)]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold text-[var(--x-ink)]">
                    {activity.title}
                  </span>
                  <span className="block text-[12px] text-[var(--x-soft)]">
                    <span dir="ltr">{activity.time}</span>
                    {' · '}
                    {activity.typeLabel}
                  </span>
                </span>
                <IconArrow className="size-4 shrink-0 text-[var(--x-faint)] rtl:rotate-180" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <a
        href={programHref}
        className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[var(--x-r-pill)] border border-[var(--x-primary)]/40 bg-[var(--x-surface)] px-4 text-[13px] font-semibold text-[var(--x-primary)] transition-colors hover:bg-[var(--x-primary)] hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--x-ring)]"
      >
        {t(locale, 'toProgram')}
        <IconArrow className="size-4 rtl:rotate-180" />
      </a>
    </section>

    {exportTarget ? (
      <section className={`${card} p-5`} aria-label={t(locale, 'addToCalendar')}>
        <p className="text-[13px] text-[var(--x-soft)]">{t(locale, 'addToCalendar')}</p>
        <div className="mt-3 flex gap-2">
          <a href={googleCalendarUrl(exportTarget)} target="_blank" rel="noreferrer" className={exportBtn}>
            <GoogleMark />
            Google
          </a>
          <a href={outlookCalendarUrl(exportTarget)} target="_blank" rel="noreferrer" className={exportBtn}>
            <OutlookMark />
            Outlook
          </a>
        </div>
      </section>
    ) : null}
  </div>
);

export default ScheduleSidebar;
