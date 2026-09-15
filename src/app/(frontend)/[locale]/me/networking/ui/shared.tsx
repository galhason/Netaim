import type { ReactNode } from 'react';
import type { Locale } from '@/config/locales';
import type { FellowParticipant } from '@/infrastructure';
import { formatDayLabel, formatTimeLabel } from '@/shared';

/*
 * The community's shared vocabulary — the handful of class recipes and
 * tiny renderers every section speaks. One copy, because two copies of
 * a card shadow is how a page stops looking like one thing.
 */
export const card =
  'lounge-rise rounded-3xl bg-[var(--n-card)] shadow-[0_14px_44px_rgba(28,36,51,0.08)] ring-1 ring-[var(--n-hair)]/70';

export const liftable =
  'transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(28,36,51,0.14)]';

export const chip =
  'inline-flex items-center rounded-full bg-[var(--n-purple)]/10 px-2.5 py-1 text-[11px] font-medium text-[var(--n-purple)]';

export const stateChip =
  'inline-flex items-center gap-1.5 rounded-full bg-[var(--n-navy)]/6 px-3 py-1 text-[11px] font-medium text-[var(--n-soft)]';

export const connectBtn =
  'inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[var(--n-purple)] px-5 text-sm font-medium text-white transition-colors hover:bg-[#6f57c8]';

export const quietConnectBtn =
  'inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[var(--n-purple)]/40 px-4 text-[13px] font-medium text-[var(--n-purple)] transition-colors hover:bg-[var(--n-purple)]/10';

export const railChip =
  'n-filter-chip';

export const channelBtn =
  'inline-flex min-h-11 items-center rounded-full border border-[var(--n-hair)] px-4 text-sm font-medium transition-colors hover:border-[var(--n-gold)]';

export const ghostBtn =
  'min-h-8 text-[11px] text-[var(--n-faint)] underline underline-offset-4 transition-colors hover:text-[var(--n-ink)]';

export const primaryBtn =
  'inline-flex min-h-11 items-center rounded-full bg-[var(--n-navy)] px-5 text-sm font-medium text-white transition-colors hover:bg-[var(--n-deep)]';

/*
 * Why a person is on your screen, as a ring color. Four meanings and a
 * neutral — never one color per person, never rainbow: gold is a room
 * you were both in, blue a matching interest, pink the same
 * organization, green an open door to meetings, purple plain discovery.
 */
export type ReasonTone = 'gold' | 'blue' | 'pink' | 'green' | 'purple';

export const RING_GRADIENT: Record<ReasonTone, string> = {
  gold: 'bg-[linear-gradient(135deg,var(--n-gold),var(--n-gold-soft))]',
  blue: 'bg-[linear-gradient(135deg,var(--n-blue),#9cbcec)]',
  pink: 'bg-[linear-gradient(135deg,var(--n-pink),#efb3cd)]',
  green: 'bg-[linear-gradient(135deg,var(--n-green),#a3cdb0)]',
  purple: 'bg-[linear-gradient(135deg,var(--n-purple),var(--n-purple-soft))]',
};

export const TONE_TEXT: Record<ReasonTone, string> = {
  gold: 'text-[#9a7a3a]',
  blue: 'text-[var(--n-blue)]',
  pink: 'text-[#c05687]',
  green: 'text-[#4c8a60]',
  purple: 'text-[var(--n-purple)]',
};

export const clock = (iso: string, locale: Locale): string =>
  [formatDayLabel(iso, locale), formatTimeLabel(iso, locale)]
    .filter(Boolean)
    .join(' · ');

export const personLine = (person: FellowParticipant): string =>
  person.headline ??
  [person.roleTitle, person.orgName].filter(Boolean).join(' · ');

export const listInterests = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

export const SearchIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className="size-4"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
  >
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </svg>
);

export const Avatar = ({
  name,
  photoUrl,
  size = 'md',
}: {
  name: string;
  photoUrl?: string;
  size?: 'sm' | 'md' | 'lg';
}) => {
  const dim =
    size === 'lg'
      ? 'size-16 text-2xl'
      : size === 'sm'
        ? 'size-10 text-sm'
        : 'size-12 text-lg';
  return photoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- participant portrait from the media API
    <img
      src={photoUrl}
      alt=""
      className={`${dim} flex-none rounded-full object-cover ring-1 ring-[var(--n-gold)]/40`}
    />
  ) : (
    <span
      className={`${dim} grid flex-none place-items-center rounded-full bg-[var(--n-purple)]/12 font-display font-semibold text-[var(--n-purple)]`}
    >
      {name.slice(0, 1)}
    </span>
  );
};

/*
 * A person inside a meaningful ring — the community's signature mark.
 * The ring is a thin gradient, the availability dot sits on the rim,
 * and a missing photo falls back to the same initial everywhere else
 * uses. Photos are never invented.
 */
export const RingedAvatar = ({
  name,
  photoUrl,
  tone,
  open,
  dim = 'size-16 md:size-20',
}: {
  name: string;
  photoUrl?: string;
  tone: ReasonTone;
  open?: boolean;
  dim?: string;
}) => (
  <span className="relative inline-block">
    <span className={`block rounded-full p-[2.5px] ${RING_GRADIENT[tone]} shadow-[0_6px_18px_rgba(28,36,51,0.14)]`}>
      <span className="block rounded-full bg-[var(--n-bg)] p-[2.5px]">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- participant portrait from the media API
          <img
            src={photoUrl}
            alt=""
            className={`${dim} rounded-full object-cover`}
          />
        ) : (
          <span
            className={`${dim} grid place-items-center rounded-full bg-[var(--n-navy)]/8 font-display text-xl font-semibold text-[var(--n-navy)]`}
          >
            {name.slice(0, 1)}
          </span>
        )}
      </span>
    </span>
    {open ? (
      <span
        aria-hidden="true"
        className="n-open-dot"
      />
    ) : null}
  </span>
);

export const SectionHead = ({
  he,
  eyebrow,
  title,
  meta,
  action,
}: {
  he: boolean;
  eyebrow?: string;
  title: string;
  meta?: string;
  action?: ReactNode;
}) => (
  <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
    <div className="min-w-0">
      {eyebrow ? (
        <p
          className={`text-[11px] font-medium tracking-[0.18em] text-[var(--n-gold)] ${
            he ? '' : 'uppercase'
          }`}
        >
          {eyebrow}
        </p>
      ) : null}
      <h2 className="font-display text-xl font-semibold md:text-2xl">
        {title}
      </h2>
    </div>
    {meta ? (
      <p className="text-xs tabular-nums text-[var(--n-soft)]">{meta}</p>
    ) : null}
    {action}
  </div>
);
