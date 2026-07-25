'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import type { Locale } from '@/config/locales';
import type { SessionType } from '@/features/program';
import type {
  AvailabilityStatus,
  DayVM,
  RegistrationState,
  SpeakerVM,
} from '../types';
import {
  IconArrow,
  IconCheck,
  IconClock,
  IconSearch,
  IconUsers,
  IconWait,
} from './icons';

/* ---------- tokens as class fragments ---------- */
export const surface =
  'rounded-[var(--x-r-card)] bg-[var(--x-surface)] shadow-[var(--x-shadow)]';
export const hairline = 'border border-[var(--x-line)]';

/* ---------- Avatar ---------- */
const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() || '?';

export const Avatar = ({
  name,
  url,
  size = 40,
  ring = true,
}: {
  name: string;
  url?: string;
  size?: number;
  ring?: boolean;
}) => {
  const cls = `flex-none rounded-full object-cover ${
    ring ? 'ring-2 ring-[var(--x-surface)]' : ''
  }`;
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      width={size}
      height={size}
      className={cls}
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      className={`grid place-items-center rounded-full bg-[var(--x-primary-wash)] text-[0.7em] font-semibold text-[var(--x-primary)] ${
        ring ? 'ring-2 ring-[var(--x-surface)]' : ''
      }`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </span>
  );
};

/* ---------- AvatarGroup ---------- */
export const AvatarGroup = ({
  speakers,
  max = 3,
  size = 40,
}: {
  speakers: SpeakerVM[];
  max?: number;
  size?: number;
}) => {
  if (speakers.length === 0) return null;
  const shown = speakers.slice(0, max);
  const extra = speakers.length - shown.length;
  return (
    <span className="flex items-center">
      <span className="flex flex-row-reverse">
        {extra > 0 ? (
          <span
            className="-ms-2 grid place-items-center rounded-full bg-[var(--x-primary-wash)] text-xs font-semibold text-[var(--x-primary)] ring-2 ring-[var(--x-surface)]"
            style={{ width: size, height: size }}
          >
            +{extra}
          </span>
        ) : null}
        {shown
          .slice()
          .reverse()
          .map((s) => (
            <span key={s.id} className="-ms-2">
              <Avatar name={s.name} url={s.photoUrl} size={size} />
            </span>
          ))}
      </span>
    </span>
  );
};

/* ---------- Type pill ---------- */
const TYPE_TONE: Record<SessionType, string> = {
  keynote: 'bg-[var(--x-primary-wash)] text-[var(--x-primary-strong)]',
  talk: 'bg-[#eef1f7] text-[#3d475c]',
  workshop: 'bg-[var(--x-ok-wash)] text-[#1f7a45]',
  panel: 'bg-[var(--x-wait-wash)] text-[#5b45c0]',
  tour: 'bg-[#e7f1fb] text-[#2b6aa3]',
  break: 'bg-[#f0f1f4] text-[var(--x-soft)]',
} as unknown as Record<SessionType, string>;

export const TypePill = ({
  type,
  label,
}: {
  type: SessionType;
  label: string;
}) => (
  <span
    className={`inline-flex items-center rounded-[var(--x-r-pill)] px-2.5 py-1 text-xs font-semibold ${
      TYPE_TONE[type] ?? TYPE_TONE.talk
    }`}
  >
    {label}
  </span>
);

/* ---------- Availability badge ---------- */
const AVAIL: Record<
  AvailabilityStatus,
  { dot: string; text: string; he: string; en: string }
> = {
  available: { dot: 'bg-[var(--x-ok)]', text: 'text-[var(--x-ok)]', he: 'זמין', en: 'Available' },
  almostFull: { dot: 'bg-[var(--x-warn)]', text: 'text-[var(--x-warn)]', he: 'כמעט מלא', en: 'Almost full' },
  full: { dot: 'bg-[var(--x-full)]', text: 'text-[var(--x-full)]', he: 'מלא', en: 'Full' },
  waitlist: { dot: 'bg-[var(--x-wait)]', text: 'text-[var(--x-wait)]', he: 'רשימת המתנה', en: 'Waiting list' },
};

export const AvailabilityBadge = ({
  status,
  confirmed,
  limit,
  locale,
  showCount = true,
}: {
  status: AvailabilityStatus;
  confirmed: number;
  limit: number | null;
  locale: Locale;
  showCount?: boolean;
}) => {
  const meta = AVAIL[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium">
      {showCount && limit != null ? (
        <span className="inline-flex items-center gap-1 tabular-nums text-[var(--x-soft)]">
          <IconUsers className="size-4" />
          {confirmed} / {limit}
        </span>
      ) : null}
      <span className="inline-flex items-center gap-1.5">
        <span className={`size-2 rounded-full ${meta.dot}`} aria-hidden="true" />
        <span className={meta.text}>{meta[locale]}</span>
      </span>
    </span>
  );
};

/* ---------- Capacity bar ---------- */
const CAP_FILL: Record<AvailabilityStatus, string> = {
  available: 'bg-[var(--x-ok)]',
  almostFull: 'bg-[var(--x-warn)]',
  full: 'bg-[var(--x-full)]',
  waitlist: 'bg-[var(--x-wait)]',
};

export const CapacityBar = ({
  confirmed,
  limit,
  status,
  locale,
  showLabel = true,
}: {
  confirmed: number;
  limit: number | null;
  status: AvailabilityStatus;
  locale: Locale;
  showLabel?: boolean;
}) => {
  if (limit == null) {
    return showLabel ? (
      <span className="text-xs font-medium text-[var(--x-faint)]">
        {locale === 'he' ? 'ללא הגבלת מקומות' : 'Unlimited seats'}
      </span>
    ) : null;
  }
  const pct = Math.min(100, Math.round((confirmed / Math.max(1, limit)) * 100));
  return (
    <div className="w-full">
      {showLabel ? (
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="font-semibold tabular-nums text-[var(--x-ink)]">
            {confirmed} / {limit}
          </span>
          <span className="tabular-nums text-[var(--x-faint)]">{pct}%</span>
        </div>
      ) : null}
      <span className="block h-1.5 w-full overflow-hidden rounded-full bg-[var(--x-line)]">
        <span
          className={`block h-full rounded-full transition-[width] duration-500 ${CAP_FILL[status]}`}
          style={{ width: `${Math.max(4, pct)}%` }}
        />
      </span>
    </div>
  );
};

/* ---------- Registration button ---------- */
const REG_LABEL: Record<RegistrationState, { he: string; en: string }> = {
  available: { he: 'הרשמה', en: 'Register' },
  registered: { he: 'רשומ/ה', en: 'Registered' },
  waitlist: { he: 'הצטרפות לרשימת המתנה', en: 'Join waiting list' },
  full: { he: 'מלא', en: 'Full' },
  conflict: { he: 'התנגשות בזמנים', en: 'Time conflict' },
  completed: { he: 'הסתיים', en: 'Completed' },
  cancelled: { he: 'בוטל', en: 'Cancelled' },
};

interface RegProps {
  state: RegistrationState;
  locale: Locale;
  slug: string;
  sessionId: string;
  registerAction?: (formData: FormData) => void | Promise<void>;
  leaveAction?: (formData: FormData) => void | Promise<void>;
  size?: 'sm' | 'md';
  block?: boolean;
}

const PRIMARY_BTN =
  'inline-flex items-center justify-center gap-2 rounded-[var(--x-r-field)] bg-[var(--x-primary)] font-medium text-[var(--x-primary-ink)] transition-colors hover:bg-[var(--x-primary-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--x-primary)]';
const WAIT_BTN =
  'inline-flex items-center justify-center gap-2 rounded-[var(--x-r-field)] bg-[var(--x-warn-wash)] font-medium text-[var(--x-warn)] transition-colors hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--x-warn)]';
const DONE_BTN =
  'inline-flex items-center justify-center gap-2 rounded-[var(--x-r-field)] bg-[var(--x-ok-wash)] font-medium text-[var(--x-ok)]';
const MUTED_BTN =
  'inline-flex items-center justify-center gap-2 rounded-[var(--x-r-field)] bg-[#f0f1f4] font-medium text-[var(--x-faint)] cursor-not-allowed';

export const RegistrationButton = ({
  state,
  locale,
  slug,
  sessionId,
  registerAction,
  leaveAction,
  size = 'md',
  block = false,
}: RegProps) => {
  const pad = size === 'sm' ? 'min-h-9 px-4 text-sm' : 'min-h-11 px-6 text-sm';
  const width = block ? 'w-full' : '';
  const label = REG_LABEL[state][locale];

  const Hidden = () => (
    <>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="sessionId" value={sessionId} />
    </>
  );

  if ((state === 'available' || state === 'waitlist') && registerAction) {
    const cls = state === 'waitlist' ? WAIT_BTN : PRIMARY_BTN;
    return (
      <form action={registerAction} className={block ? 'w-full' : ''}>
        <Hidden />
        <button type="submit" className={`${cls} ${pad} ${width}`}>
          {state === 'waitlist' ? <IconWait className="size-4" /> : null}
          {label}
        </button>
      </form>
    );
  }
  if (state === 'registered' && leaveAction) {
    return (
      <form action={leaveAction} className={block ? 'w-full' : ''}>
        <Hidden />
        <button
          type="submit"
          className={`${DONE_BTN} ${pad} ${width} group relative`}
        >
          <IconCheck className="size-4" />
          <span className="group-hover:hidden">{label}</span>
          <span className="hidden group-hover:inline">
            {locale === 'he' ? 'ביטול הרשמה' : 'Cancel'}
          </span>
        </button>
      </form>
    );
  }
  return (
    <button type="button" disabled className={`${MUTED_BTN} ${pad} ${width}`}>
      {label}
    </button>
  );
};

/* ---------- Info row ---------- */
export const InfoRow = ({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) => (
  <div className="flex items-center gap-3 text-sm text-[var(--x-soft)]">
    <span className="grid size-8 flex-none place-items-center rounded-lg bg-[var(--x-primary-wash)] text-[var(--x-primary)]">
      {icon}
    </span>
    <span className="min-w-0">{children}</span>
  </div>
);

/* ---------- Section header ---------- */
export const SectionHeader = ({
  eyebrow,
  title,
  sub,
  action,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  action?: ReactNode;
}) => (
  <div className="flex flex-wrap items-end justify-between gap-4">
    <div className="min-w-0">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--x-primary)]">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-[var(--x-ink)] md:text-3xl">
        {title}
      </h2>
      {sub ? (
        <p className="mt-1.5 text-[15px] text-[var(--x-soft)]">{sub}</p>
      ) : null}
    </div>
    {action ? <div className="flex-none">{action}</div> : null}
  </div>
);

/* ---------- Search bar ---------- */
export const SearchBar = ({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) => (
  <div className="relative">
    <span className="pointer-events-none absolute inset-y-0 start-4 grid place-items-center text-[var(--x-faint)]">
      <IconSearch className="size-5" />
    </span>
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className="w-full rounded-2xl border border-[var(--x-line)] bg-[var(--x-surface)] py-4 pe-4 ps-12 text-[15px] text-[var(--x-ink)] shadow-[0_2px_10px_rgba(20,25,45,0.05)] outline-none transition-[box-shadow,border-color] duration-200 placeholder:text-[var(--x-faint)] focus:border-[var(--x-primary)] focus:shadow-[0_8px_30px_rgba(110,86,207,0.16)] focus:ring-4 focus:ring-[var(--x-ring)]"
    />
  </div>
);

/* ---------- Day tabs ---------- */
export const DayTabs = ({
  days,
  active,
  onSelect,
  dayWord,
}: {
  days: DayVM[];
  active: string;
  onSelect: (key: string) => void;
  dayWord: string;
}) => {
  const reduce = useReducedMotion();
  return (
    <div className="flex flex-wrap gap-2.5" role="tablist">
      {days.map((day) => {
        const on = day.key === active;
        return (
          <button
            key={day.key}
            role="tab"
            aria-selected={on}
            onClick={() => onSelect(day.key)}
            className={`relative min-w-[92px] rounded-2xl px-4 py-2.5 text-start transition-colors ${
              on
                ? 'text-[var(--x-primary-ink)]'
                : 'bg-[var(--x-surface)] text-[var(--x-ink)] shadow-[var(--x-shadow)] hover:bg-[var(--x-raise)]'
            }`}
          >
            {on ? (
              <motion.span
                layoutId="day-tab"
                transition={
                  reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }
                }
                className="absolute inset-0 rounded-2xl bg-[var(--x-primary)]"
              />
            ) : null}
            <span className="relative block text-sm font-semibold">
              {dayWord} {day.index}
            </span>
            <span
              className={`relative block text-xs ${
                on ? 'text-[var(--x-primary-ink)]/75' : 'text-[var(--x-faint)]'
              }`}
            >
              {day.weekday} {day.dateNum}
            </span>
          </button>
        );
      })}
    </div>
  );
};

/* ---------- Filter chips ---------- */
export const FilterChips = ({
  filters,
  active,
  onSelect,
}: {
  filters: { key: string; label: string }[];
  active: string;
  onSelect: (key: string) => void;
}) => {
  const reduce = useReducedMotion();
  return (
    <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible [scrollbar-width:none]">
      {filters.map((f) => {
        const on = f.key === active;
        return (
          <button
            key={f.key}
            onClick={() => onSelect(f.key)}
            aria-pressed={on}
            className={`relative flex-none rounded-[var(--x-r-pill)] px-4 py-2 text-sm font-medium transition-colors ${
              on
                ? 'text-white'
                : 'bg-[var(--x-surface)] text-[var(--x-soft)] shadow-[var(--x-shadow)] hover:text-[var(--x-ink)]'
            }`}
          >
            {on ? (
              <motion.span
                layoutId="filter-chip"
                transition={
                  reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }
                }
                className="absolute inset-0 rounded-[var(--x-r-pill)] bg-[var(--x-nav)]"
              />
            ) : null}
            <span className="relative">{f.label}</span>
          </button>
        );
      })}
    </div>
  );
};

/* ---------- Empty state ---------- */
/*
 * Nothing here yet is still a moment in the product, so it gets a way
 * forward: an icon to soften the blank, a sentence that explains, and —
 * where there is something useful to do — the door to do it.
 */
export const EmptyState = ({
  title,
  hint,
  icon,
  action,
}: {
  title: string;
  hint?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) => (
  <div
    className={`${surface} ${hairline} flex flex-col items-center gap-3 px-6 py-16 text-center`}
  >
    <span className="grid size-12 place-items-center rounded-full bg-[var(--x-primary-wash)] text-[var(--x-primary)]">
      {icon ?? <IconClock className="size-6" />}
    </span>
    <p className="font-display text-lg font-semibold text-[var(--x-ink)]">
      {title}
    </p>
    {hint ? <p className="max-w-sm text-sm text-[var(--x-soft)]">{hint}</p> : null}
    {action ? <div className="mt-1">{action}</div> : null}
  </div>
);

/* ---------- Ghost link ---------- */
export const GhostLink = ({
  children,
  href,
}: {
  children: ReactNode;
  href: string;
}) => (
  <a
    href={href}
    className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--x-primary)] transition-colors hover:text-[var(--x-primary-strong)]"
  >
    {children}
    <IconArrow className="size-4 rtl:-scale-x-100" />
  </a>
);
