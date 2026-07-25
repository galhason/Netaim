'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { Locale } from '@/config/locales';
import {
  ActivityCard,
  Avatar,
  IconArrow,
  IconCalendar,
  IconCheck,
  IconClock,
  IconClose,
  IconLive,
  IconPin,
  IconStarFilled,
  IconUsers,
  IconWait,
  type ActivityVM,
  type DayVM,
  type MySpeakerVM,
} from '@/features/conference';
import { googleCalendarUrl, outlookCalendarUrl } from './calendar-links';

const CARD =
  'rounded-[var(--x-r-card)] border border-[var(--x-line)] bg-[var(--x-surface)] p-5 shadow-[var(--x-shadow)]';

/*
 * Widget headings are quieter than page headings — a line of label, an
 * optional line of context. The page's SectionHeader is sized for a
 * section; the sidebar needs something that sits under the eye.
 */
const WidgetTitle = ({ title, sub }: { title: string; sub?: string }) => (
  <div className="min-w-0">
    <h2 className="text-[13px] font-bold uppercase tracking-[0.14em] text-[var(--x-soft)]">
      {title}
    </h2>
    {sub ? (
      <p className="mt-1 text-[12px] leading-snug text-[var(--x-faint)]">{sub}</p>
    ) : null}
  </div>
);

/* ------------------------------------------------------------------ *
 * KPI cards
 * ------------------------------------------------------------------ */

export interface KpiVM {
  key: string;
  label: string;
  value: number;
  sub?: string;
  icon: 'calendar' | 'clock' | 'check' | 'star';
}

const KPI_ICON = {
  calendar: IconCalendar,
  clock: IconClock,
  check: IconCheck,
  star: IconStarFilled,
} as const;

/*
 * Four numbers, four verbs: how much you took on, how much of it is
 * today, how much is behind you, how much you marked as yours. Each one
 * carries a second line — a number alone says "six", a number with its
 * context says "six of eight", which is the sentence a participant is
 * actually asking.
 */
export const KpiRow = ({ items }: { items: KpiVM[] }) => {
  const reduce = useReducedMotion();
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {items.map((item, i) => {
        const Icon = KPI_ICON[item.icon];
        return (
          <motion.div
            key={item.key}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: reduce ? 0 : i * 0.05 }}
            whileHover={reduce ? undefined : { y: -3 }}
            className={`${CARD} flex items-start justify-between gap-3 transition-shadow hover:shadow-[var(--x-shadow-lift)]`}
          >
            <span className="min-w-0">
              <span className="block font-display text-[1.75rem] font-extrabold leading-none tabular-nums text-[var(--x-ink)]">
                {item.value}
              </span>
              <span className="mt-1.5 block truncate text-[12px] font-semibold text-[var(--x-soft)]">
                {item.label}
              </span>
              {item.sub ? (
                <span className="mt-0.5 block truncate text-[11px] text-[var(--x-faint)]">
                  {item.sub}
                </span>
              ) : null}
            </span>
            <span className="grid size-9 shrink-0 place-items-center rounded-[var(--x-r-field)] bg-[var(--x-primary-wash)] text-[var(--x-primary)]">
              <Icon className="size-[18px]" />
            </span>
          </motion.div>
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------ *
 * Notice board
 * ------------------------------------------------------------------ */

export type NoticeTone = 'live' | 'soon' | 'ok' | 'warn' | 'wait';

export interface BoardNoticeVM {
  id: string;
  text: string;
  tone: NoticeTone;
  activityId?: string;
  actionLabel?: string;
}

const TONE: Record<NoticeTone, { dot: string; wash: string; ink: string }> = {
  live: {
    dot: 'bg-[var(--x-live)]',
    wash: 'bg-[var(--x-full-wash)]',
    ink: 'text-[var(--x-full)]',
  },
  soon: {
    dot: 'bg-[var(--x-warn)]',
    wash: 'bg-[var(--x-warn-wash)]',
    ink: 'text-[var(--x-warn)]',
  },
  ok: {
    dot: 'bg-[var(--x-ok)]',
    wash: 'bg-[var(--x-ok-wash)]',
    ink: 'text-[var(--x-ok)]',
  },
  warn: {
    dot: 'bg-[var(--x-full)]',
    wash: 'bg-[var(--x-full-wash)]',
    ink: 'text-[var(--x-full)]',
  },
  wait: {
    dot: 'bg-[var(--x-wait)]',
    wash: 'bg-[var(--x-wait-wash)]',
    ink: 'text-[var(--x-wait)]',
  },
};

const NOTICE_ICON: Record<NoticeTone, typeof IconLive> = {
  live: IconLive,
  soon: IconClock,
  ok: IconCheck,
  warn: IconClose,
  wait: IconWait,
};

/*
 * What changed since you last looked. Nothing here is stored anywhere —
 * every line is read off the schedule the page already holds, which is
 * why it can never go stale or contradict the timeline beside it. Read
 * lines disappear; an empty board disappears with them.
 */
export const NoticeBoard = ({
  items,
  locale,
  onOpen,
}: {
  items: BoardNoticeVM[];
  locale: Locale;
  onOpen: (id: string) => void;
}) => {
  const he = locale === 'he';
  const reduce = useReducedMotion();
  const [read, setRead] = useState<string[]>([]);
  const unread = items.filter((item) => !read.includes(item.id));
  if (unread.length === 0) return null;

  return (
    <section className={CARD}>
      <div className="flex items-center justify-between gap-3">
        <WidgetTitle title={he ? 'עדכונים' : 'Updates'} />
        <span className="rounded-[var(--x-r-pill)] bg-[var(--x-primary-wash)] px-2 py-0.5 text-[11px] font-bold tabular-nums text-[var(--x-primary)]">
          {unread.length}
        </span>
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {unread.map((item) => {
            const tone = TONE[item.tone];
            const Icon = NOTICE_ICON[item.tone];
            return (
              <motion.li
                key={item.id}
                layout={!reduce}
                initial={reduce ? false : { opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduce ? undefined : { opacity: 0, height: 0 }}
                transition={{ duration: 0.24 }}
                className={`flex items-start gap-2.5 rounded-[var(--x-r-field)] ${tone.wash} px-3 py-2.5`}
              >
                <span className={`mt-0.5 shrink-0 ${tone.ink}`}>
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-medium leading-snug text-[var(--x-ink)]">
                    {item.text}
                  </span>
                  {item.activityId && item.actionLabel ? (
                    <button
                      type="button"
                      onClick={() => onOpen(item.activityId as string)}
                      className={`mt-1 text-[11.5px] font-bold underline-offset-2 hover:underline ${tone.ink}`}
                    >
                      {item.actionLabel}
                    </button>
                  ) : null}
                </span>
                <button
                  type="button"
                  onClick={() => setRead((prev) => [...prev, item.id])}
                  aria-label={he ? 'סימון כנקרא' : 'Mark as read'}
                  className="-me-1 grid size-6 shrink-0 place-items-center rounded-full text-[var(--x-faint)] transition-colors hover:bg-white/60 hover:text-[var(--x-ink)]"
                >
                  <IconClose className="size-3.5" />
                </button>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </section>
  );
};

/* ------------------------------------------------------------------ *
 * Conference calendar
 * ------------------------------------------------------------------ */

/*
 * A calendar with nothing in it but the conference. Three days, or five,
 * shown as they are — no empty month grid to scan past. A thumb can swipe
 * it; each day snaps into place rather than drifting.
 */
export const ConferenceCalendar = ({
  days,
  active,
  onSelect,
  locale,
  counts,
}: {
  days: DayVM[];
  active: string;
  onSelect: (key: string) => void;
  locale: Locale;
  counts?: Record<string, number>;
}) => {
  const he = locale === 'he';
  if (days.length === 0) return null;
  return (
    <section className={CARD}>
      <WidgetTitle title={he ? 'ימי הכנס' : 'Conference days'} />
      <div className="-mx-1 mt-3.5 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 pb-1.5">
        {days.map((day) => {
          const on = day.key === active;
          const count = counts?.[day.key] ?? 0;
          return (
            <button
              key={day.key}
              type="button"
              onClick={() => onSelect(day.key)}
              aria-pressed={on}
              className={`flex min-w-[66px] shrink-0 snap-start flex-col items-center gap-1 rounded-[var(--x-r-field)] border px-3 py-3 transition-colors ${
                on
                  ? 'border-transparent bg-[var(--x-nav)] text-white'
                  : 'border-[var(--x-line)] bg-[var(--x-raise)] text-[var(--x-soft)] hover:border-[var(--x-line-strong)]'
              }`}
            >
              <span className="text-[11px] font-medium uppercase tracking-wide opacity-70">
                {day.weekday}
              </span>
              <span className="font-display text-lg font-bold leading-none tabular-nums">
                {day.dateNum}
              </span>
              <span className="text-[11px] opacity-70">{day.month}</span>
              <span
                aria-hidden="true"
                className={`mt-0.5 flex h-1.5 items-center gap-[3px] ${
                  count === 0 ? 'opacity-0' : ''
                }`}
              >
                {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
                  <span
                    key={i}
                    className={`size-1.5 rounded-full ${
                      on ? 'bg-[var(--x-gold-soft)]' : 'bg-[var(--x-primary)]'
                    }`}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ *
 * My speakers
 * ------------------------------------------------------------------ */

export interface MySpeakerRowVM extends MySpeakerVM {
  nextTime?: string;
  nextTitle?: string;
}

/*
 * The people behind the day you built. Each one is a door: from here to
 * their profile, from their profile to the rest of what they are doing —
 * which is how a participant finds the session nobody told them about.
 * The row carries the next time you will hear them, because that is the
 * one fact you need before deciding whether to walk over.
 */
export const MySpeakers = ({
  speakers,
  locale,
}: {
  speakers: MySpeakerRowVM[];
  locale: Locale;
}) => {
  const he = locale === 'he';
  if (speakers.length === 0) return null;
  return (
    <section className={CARD}>
      <WidgetTitle
        title={he ? 'הדוברים שלי' : 'My speakers'}
        sub={
          he
            ? 'מי שתשמעו היום ומחר — לחיצה פותחת את הפרופיל.'
            : 'Who you will hear — tap to open a profile.'
        }
      />
      <ul className="mt-3.5 flex flex-col gap-1.5">
        {speakers.map((speaker) => {
          const role = [speaker.role, speaker.company].filter(Boolean).join(' · ');
          const count = he
            ? `${speaker.count} פעילויות`
            : `${speaker.count} ${speaker.count === 1 ? 'activity' : 'activities'}`;
          const body = (
            <>
              <Avatar name={speaker.name} url={speaker.photoUrl} size={44} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-[var(--x-ink)]">
                  {speaker.name}
                </span>
                {role ? (
                  <span className="block truncate text-[12px] text-[var(--x-soft)]">
                    {role}
                  </span>
                ) : null}
                <span className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-[var(--x-r-pill)] bg-[var(--x-primary-wash)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--x-primary)]">
                    {count}
                  </span>
                  {speaker.nextTime ? (
                    <span className="flex items-center gap-1 text-[11px] tabular-nums text-[var(--x-faint)]">
                      <IconClock className="size-3" />
                      {speaker.nextTime}
                    </span>
                  ) : null}
                </span>
              </span>
            </>
          );
          return (
            <li key={speaker.id}>
              {speaker.registered ? (
                <a
                  href={`/${locale}/speakers/${speaker.id}`}
                  className="group flex items-center gap-3 rounded-[var(--x-r-field)] border border-transparent px-2.5 py-2.5 transition-colors hover:border-[var(--x-line)] hover:bg-[var(--x-primary-wash)]"
                >
                  {body}
                  <IconArrow className="size-4 shrink-0 text-[var(--x-faint)] transition-colors group-hover:text-[var(--x-primary)] rtl:rotate-180" />
                </a>
              ) : (
                <span className="flex items-center gap-3 px-2.5 py-2.5">{body}</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};

/* ------------------------------------------------------------------ *
 * Free time / smart recommendations
 * ------------------------------------------------------------------ */

export interface GapSuggestion {
  key: string;
  from: string;
  to: string;
  minutes: number;
  options: ActivityVM[];
}

/*
 * The gaps nobody planned. Whenever three quarters of an hour opens up,
 * we name it and offer only what actually fits: still has seats, does not
 * collide, same conference. Silence when there is nothing worth saying.
 */
export const FreeTime = ({
  gaps,
  locale,
  onOpen,
}: {
  gaps: GapSuggestion[];
  locale: Locale;
  onOpen: (id: string) => void;
}) => {
  const he = locale === 'he';
  if (gaps.length === 0) return null;
  return (
    <section className={CARD}>
      <WidgetTitle
        title={he ? 'זמן פנוי' : 'Free time'}
        sub={
          he
            ? 'חלונות פתוחים ביום שלך, והצעות שנכנסות בדיוק בהם.'
            : 'Open windows in your day, and what fits inside them.'
        }
      />
      <div className="mt-3.5 flex flex-col gap-4">
        {gaps.map((gap) => (
          <div key={gap.key}>
            <p className="flex items-center gap-2 text-[12px] font-semibold text-[var(--x-warn)]">
              <IconClock className="size-4" />
              <span className="tabular-nums">
                {gap.from}–{gap.to}
              </span>
              <span className="font-normal text-[var(--x-soft)]">
                {he ? `${gap.minutes} דקות פנויות` : `${gap.minutes} min free`}
              </span>
            </p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {gap.options.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(option.id)}
                    className="group w-full rounded-[var(--x-r-field)] border border-[var(--x-line)] bg-[var(--x-raise)] px-3 py-2.5 text-start transition-colors hover:border-[var(--x-primary)] hover:bg-[var(--x-primary-wash)]"
                  >
                    <span className="block truncate text-[13px] font-semibold text-[var(--x-ink)]">
                      {option.title}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--x-soft)]">
                      <span className="tabular-nums">{option.time}</span>
                      {option.room ? (
                        <span className="flex items-center gap-1">
                          <IconPin className="size-3" />
                          {option.room}
                        </span>
                      ) : null}
                      {option.speakers[0] ? (
                        <span className="flex min-w-0 items-center gap-1">
                          <IconUsers className="size-3 shrink-0" />
                          <span className="truncate">
                            {option.speakers[0].name}
                          </span>
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ *
 * Export card
 * ------------------------------------------------------------------ */

const EXPORT_BTN =
  'flex min-h-[52px] flex-1 items-center gap-3 rounded-[var(--x-r-field)] border border-[var(--x-line)] bg-[var(--x-raise)] px-3.5 py-2.5 text-start transition-all hover:-translate-y-0.5 hover:border-[var(--x-primary)] hover:bg-[var(--x-primary-wash)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0';

const GoogleMark = () => (
  <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-white shadow-[0_1px_3px_rgba(20,25,45,0.14)]">
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.7-.06-1.38-.18-2.03H12v3.84h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.89-1.74 2.98-4.3 2.98-7.33Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.62-2.44l-3.24-2.5c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.06v2.58A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.41 13.9a6 6 0 0 1 0-3.8V7.52H3.06a10 10 0 0 0 0 8.96l3.35-2.58Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.98c1.47 0 2.79.5 3.83 1.5l2.87-2.87C16.95 2.99 14.7 2 12 2a10 10 0 0 0-8.94 5.52l3.35 2.58C7.2 7.74 9.4 5.98 12 5.98Z"
      />
    </svg>
  </span>
);

const OutlookMark = () => (
  <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-white shadow-[0_1px_3px_rgba(20,25,45,0.14)]">
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path fill="#0364B8" d="M13 5h8v4.2l-8 3.4V5Z" />
      <path fill="#28A8EA" d="M13 12.6 21 9.2V19h-8v-6.4Z" />
      <rect x="2.5" y="4" width="11" height="16" rx="2" fill="#0F5FA8" />
      <path
        fill="#fff"
        d="M8 8.2c-1.7 0-2.9 1.6-2.9 3.8S6.3 15.8 8 15.8s2.9-1.6 2.9-3.8S9.7 8.2 8 8.2Zm0 1.5c.8 0 1.4.9 1.4 2.3S8.8 14.3 8 14.3s-1.4-.9-1.4-2.3S7.2 9.7 8 9.7Z"
      />
    </svg>
  </span>
);

/*
 * The schedule, portable. One card, two doors — the two calendars people
 * here actually keep. Nothing to download and nothing to print: a piece of
 * paper goes stale the moment the program moves, while a calendar entry
 * travels in the participant's pocket and stays alive.
 */
export const ExportCard = ({
  activities,
  next,
  locale,
}: {
  activities: ActivityVM[];
  next: ActivityVM | null;
  locale: Locale;
}) => {
  const he = locale === 'he';
  const target = next ?? activities[0] ?? null;
  const hint = he ? 'הפעילות הבאה' : 'Next activity';

  /* Nothing in the schedule, nothing to hand over — the card stays away. */
  if (!target) return null;

  return (
    <section className={CARD}>
      <WidgetTitle
        title={he ? 'קחו את הלוח איתכם' : 'Take your schedule with you'}
        sub={
          he
            ? 'הוסיפו את הפעילות הבאה ליומן שלכם.'
            : 'Add the next activity to your calendar.'
        }
      />
      <div className="mt-3.5 flex flex-col gap-2.5 sm:flex-row">
        <a
          href={googleCalendarUrl(target)}
          target="_blank"
          rel="noreferrer"
          className={EXPORT_BTN}
        >
          <GoogleMark />
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold text-[var(--x-ink)]">
              Google Calendar
            </span>
            <span className="block truncate text-[11px] text-[var(--x-soft)]">
              {hint}
            </span>
          </span>
        </a>
        <a
          href={outlookCalendarUrl(target)}
          target="_blank"
          rel="noreferrer"
          className={EXPORT_BTN}
        >
          <OutlookMark />
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold text-[var(--x-ink)]">
              Outlook
            </span>
            <span className="block truncate text-[11px] text-[var(--x-soft)]">
              {hint}
            </span>
          </span>
        </a>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ *
 * Discovery
 * ------------------------------------------------------------------ */

/*
 * The bottom of the page is not the end of the conference. Whatever the
 * participant has not yet claimed — same speakers, same kinds of session,
 * still open, no collision with anything they hold — is offered here in
 * the very same card the Program uses, so registering is one motion and
 * the two pages never drift apart.
 */
export const Discovery = ({
  items,
  locale,
  slug,
  onOpen,
  registerAction,
  leaveAction,
}: {
  items: ActivityVM[];
  locale: Locale;
  slug: string;
  onOpen: (id: string) => void;
  registerAction: (formData: FormData) => void | Promise<void>;
  leaveAction: (formData: FormData) => void | Promise<void>;
}) => {
  const he = locale === 'he';
  if (items.length === 0) return null;
  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-bold tracking-tight text-[var(--x-ink)] md:text-2xl">
            {he ? 'אולי יעניין אותך' : 'You might also like'}
          </h2>
          <p className="mt-1 text-[13px] text-[var(--x-soft)]">
            {he
              ? 'פעילויות פנויות שמתאימות למה שכבר בחרתם, ונכנסות ללוח שלכם.'
              : 'Open activities close to what you already chose — and free in your schedule.'}
          </p>
        </div>
        <a
          href={`/${locale}/program`}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-[var(--x-r-pill)] border border-[var(--x-line)] bg-[var(--x-surface)] px-4 text-[13px] font-semibold text-[var(--x-primary)] transition-colors hover:bg-[var(--x-primary-wash)]"
        >
          {he ? 'לתוכנייה המלאה' : 'Full program'}
          <IconArrow className="size-4 rtl:rotate-180" />
        </a>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((activity, i) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            locale={locale}
            slug={slug}
            onOpen={onOpen}
            registerAction={registerAction}
            leaveAction={leaveAction}
            index={i}
          />
        ))}
      </div>
    </section>
  );
};
