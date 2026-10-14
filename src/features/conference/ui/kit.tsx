'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { useId, useState, type ReactNode } from 'react';
import LanguageDialog from './language-dialog';
import type { Locale } from '@/config/locales';
import type { SessionType } from '@/features/program';
import type {
  AvailabilityStatus,
  DayVM,
  RegistrationState,
  SpeakerVM,
  VoteVM,
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
/*
 * One colour per kind, by the kind's own name — never by its label, so
 * a seminar is the same orange in Hebrew and in English. Where a scope
 * paints the kinds (the programme sets `--x-kind-*`), the pill is that
 * colour with white on it; anywhere else the variable is unset and the
 * fallback is the platform's quiet wash, as before. The tile's cover
 * placeholder reads the same variables, so the two always agree.
 */
const TYPE_TONE: Record<string, string> = {
  keynote: 'bg-[var(--x-kind-keynote,var(--x-primary-wash))] text-[var(--x-kind-ink,var(--x-primary-strong))]',
  talk: 'bg-[var(--x-kind-talk,var(--x-mute-wash))] text-[var(--x-kind-ink,var(--x-mute))]',
  workshop: 'bg-[var(--x-kind-workshop,var(--x-ok-wash))] text-[var(--x-kind-ink,var(--x-ok))]',
  panel: 'bg-[var(--x-kind-panel,var(--x-wait-wash))] text-[var(--x-kind-ink,var(--x-wait))]',
  tour: 'bg-[var(--x-kind-tour,var(--x-tour-wash))] text-[var(--x-kind-ink,var(--x-tour))]',
  break: 'bg-[var(--x-kind-break,var(--x-mute-wash))] text-[var(--x-kind-ink,var(--x-soft))]',
  gathering: 'bg-[var(--x-kind-gathering,var(--x-primary-wash))] text-[var(--x-kind-ink,var(--x-primary-strong))]',
};

export const TypePill = ({
  type,
  label,
}: {
  type: SessionType;
  label: string;
}) => (
  <span
    className={`inline-flex items-center rounded-[var(--x-r-pill)] px-2.5 py-1 text-xs font-bold ${
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
  almostFull: { dot: 'bg-[var(--x-warn)]', text: 'text-[var(--x-warn)]', he: 'נשארו מקומות אחרונים', en: 'Last places left' },
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
  opensLater: { he: 'ההרשמה טרם נפתחה', en: 'Registration not open yet' },
  closed: { he: 'ההרשמה נסגרה', en: 'Registration closed' },
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
  /*
   * Whether the registered guest may give the place back here. False
   * when the activity forbids cancelling, or its deadline has passed:
   * the button then only states the registration.
   */
  canLeave?: boolean;
  /* A short explanation carried as the control's title, e.g. when it opens. */
  note?: string;
  size?: 'sm' | 'md';
  block?: boolean;
  /*
   * The vote on the language, where the activity holds one. While it
   * is open, registering asks for a language first — the dialog joins
   * this very form, so the server gets the choice with the request.
   */
  vote?: VoteVM;
}

const VOTE_COPY = {
  ask: { he: 'באיזו שפה תרצו את הפעילות?', en: 'Which language would you like?' },
  change: { he: 'שינוי הבחירה', en: 'Change your choice' },
  chose: { he: 'בחרת:', en: 'You chose:' },
  decided: { he: 'השפה שנקבעה:', en: 'Language decided:' },
  differs: { he: 'שונה ממה שביקשת', en: 'not what you asked for' },
  save: { he: 'שמירה', en: 'Save' },
  changeLink: { he: 'שינוי', en: 'Change' },
};

/*
 * The registration control's shape and weight come from the page it is
 * on. Across the platform it is the field-radius, medium-weight button
 * it always was; in the agenda it is the organisation's programme
 * button — a pill, set bold (see `.experience--programme`).
 */
const PRIMARY_BTN =
  'inline-flex items-center justify-center gap-2 rounded-[var(--x-r-button)] bg-[var(--x-primary)] [font-weight:var(--x-button-weight)] text-[var(--x-primary-ink)] transition-colors hover:bg-[var(--x-primary-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--x-primary)]';
const WAIT_BTN =
  'inline-flex items-center justify-center gap-2 rounded-[var(--x-r-button)] bg-[var(--x-warn-wash)] [font-weight:var(--x-button-weight)] text-[var(--x-warn)] transition-colors hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--x-warn)]';
const DONE_BTN =
  'inline-flex items-center justify-center gap-2 rounded-[var(--x-r-button)] bg-[var(--x-ok-wash)] [font-weight:var(--x-button-weight)] text-[var(--x-ok)]';
const MUTED_BTN =
  'inline-flex items-center justify-center gap-2 rounded-[var(--x-r-button)] bg-[var(--x-mute-wash)] [font-weight:var(--x-button-weight)] text-[var(--x-faint)] cursor-not-allowed';

export const RegistrationButton = ({
  state,
  locale,
  slug,
  sessionId,
  registerAction,
  leaveAction,
  canLeave = true,
  note,
  size = 'md',
  block = false,
  vote,
}: RegProps) => {
  const pad = size === 'sm' ? 'min-h-9 px-4 text-sm' : 'min-h-11 px-6 text-sm';
  const width = block ? 'w-full' : '';
  const label = REG_LABEL[state][locale];
  const formId = useId();
  const [asking, setAsking] = useState(false);
  const askFirst = Boolean(vote && !vote.decided && vote.options.length > 0);

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
      <form id={formId} action={registerAction} className={block ? 'w-full' : ''}>
        <Hidden />
        <button
          type={askFirst ? 'button' : 'submit'}
          onClick={askFirst ? () => setAsking(true) : undefined}
          className={`${cls} ${pad} ${width}`}
        >
          {state === 'waitlist' ? <IconWait className="size-4" /> : null}
          {label}
        </button>
        {asking && vote ? (
          <LanguageDialog
            formId={formId}
            options={vote.options}
            confirmLabel={label}
            title={VOTE_COPY.ask[locale]}
            locale={locale}
            onClose={() => setAsking(false)}
          />
        ) : null}
      </form>
    );
  }
  if (state === 'registered' && (!canLeave || !leaveAction)) {
    return (
      <span
        className={`${DONE_BTN} ${pad} ${width}`}
        title={note ?? (locale === 'he' ? 'לא ניתן לבטל את ההרשמה' : 'This registration cannot be cancelled')}
      >
        <IconCheck className="size-4" />
        {label}
      </span>
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
    <button type="button" disabled title={note} className={`${MUTED_BTN} ${pad} ${width}`}>
      {label}
    </button>
  );
};

/*
 * What a registered reader asked for, and what was decided. While the
 * vote is open: "בחרת: אנגלית · שינוי". Once decided: the language the
 * activity will be held in — with a quiet word when it is not the one
 * this reader wanted, so the seat is theirs to keep or give back.
 */
export const VoteLine = ({
  vote,
  locale,
  slug,
  sessionId,
  changeAction,
}: {
  vote: VoteVM;
  locale: Locale;
  slug: string;
  sessionId: string;
  /* Saves a changed vote; without it the line only states the choice. */
  changeAction?: (formData: FormData) => void | Promise<void>;
}) => {
  const formId = useId();
  const [asking, setAsking] = useState(false);
  if (vote.decided) {
    const differs = vote.mine && vote.mine.value !== vote.decided.value;
    return (
      <p className="text-[13px] text-[var(--x-soft)]">
        <span>{VOTE_COPY.decided[locale]}</span>{' '}
        <span className="font-semibold text-[var(--x-ink)]">{vote.decided.label}</span>
        {differs ? <span className="text-[var(--x-warn)]"> · {VOTE_COPY.differs[locale]}</span> : null}
      </p>
    );
  }
  if (!vote.mine) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 text-[13px] text-[var(--x-soft)]">
      <span>{VOTE_COPY.chose[locale]}</span>
      <span className="font-semibold text-[var(--x-ink)]">{vote.mine.label}</span>
      {changeAction ? (
        <form id={formId} action={changeAction} className="inline">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="sessionId" value={sessionId} />
          <button
            type="button"
            onClick={() => setAsking(true)}
            className="font-semibold text-[var(--x-primary)] underline-offset-2 hover:underline"
          >
            · {VOTE_COPY.changeLink[locale]}
          </button>
          {asking ? (
            <LanguageDialog
              formId={formId}
              options={vote.options}
              current={vote.mine}
              confirmLabel={VOTE_COPY.save[locale]}
              title={VOTE_COPY.change[locale]}
              locale={locale}
              onClose={() => setAsking(false)}
            />
          ) : null}
        </form>
      ) : null}
    </div>
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
      className="w-full rounded-2xl border border-[var(--x-line)] bg-[var(--x-surface)] py-4 pe-4 ps-12 text-[15px] text-[var(--x-ink)] shadow-[0_2px_10px_rgba(23,32,51,0.05)] outline-none transition-[box-shadow,border-color] duration-200 placeholder:text-[var(--x-faint)] focus:border-[var(--x-primary)] focus:shadow-[0_8px_30px_rgba(23,63,115,0.16)] focus:ring-4 focus:ring-[var(--x-ring)]"
    />
  </div>
);

/* ---------- Day tabs ---------- */
/*
 * One tab per conference day, named as a person says it — "יום שבת",
 * "14 בנובמבר" — rather than "day 2": a visitor planning a trip reads
 * dates, not ordinals.
 */
export const DayTabs = ({
  days,
  active,
  onSelect,
}: {
  days: DayVM[];
  active: string;
  onSelect: (key: string) => void;
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
              {day.weekdayLong}
            </span>
            <span
              className={`relative block text-xs ${
                on ? 'text-[var(--x-primary-ink)]/75' : 'text-[var(--x-faint)]'
              }`}
            >
              {day.dateLong}
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
  <Link
    href={href}
    className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--x-primary)] transition-colors hover:text-[var(--x-primary-strong)]"
  >
    {children}
    <IconArrow className="size-4 rtl:-scale-x-100" />
  </Link>
);
