'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef } from 'react';
import { motion, useReducedMotion, type Variants } from 'motion/react';
import type { Locale } from '@/config/locales';
import { CINEMATIC_UI } from '../constants/cinematic-content';
import SessionCover from './session-cover';
import type { FeaturedSessionItem } from '../types/cinematic';
import { RevealText } from '@/shared';

/*
 * The card reads two optional, CMS-derived numbers — how many have
 * registered and the capacity. They are optional so the carousel data
 * contract can adopt them without breaking; when they are present the
 * registration layer lights up, when absent the card stays clean.
 */
interface FeaturedSession extends FeaturedSessionItem {
  registered?: number;
  capacity?: number;
}

interface FeaturedSessionsSceneProps {
  sessions: FeaturedSessionItem[];
  locale: Locale;
}

const EASE = [0.16, 1, 0.3, 1] as const;

const railContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const cardItem: Variants = {
  hidden: { opacity: 0, y: 26 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

/* Session-type pill — stable subtle tint per type, no type key needed. */
const TYPE_STYLES = [
  'border-violet-300/25 bg-violet-400/10 text-violet-200',
  'border-teal-300/25 bg-teal-400/10 text-teal-200',
  'border-rose-300/25 bg-rose-400/10 text-rose-200',
  'border-amber-300/25 bg-amber-400/10 text-amber-200',
  'border-sky-300/25 bg-sky-400/10 text-sky-200',
];

const typeStyle = (label: string): string => {
  let sum = 0;
  for (let i = 0; i < label.length; i += 1) sum += label.charCodeAt(i);
  return TYPE_STYLES[sum % TYPE_STYLES.length] ?? TYPE_STYLES[0]!;
};

/*
 * Registration availability. The status is derived, never authored, and
 * lives in one place so new states (waiting list, invite only, opens
 * soon, cancelled) can be added here later without touching the layout.
 */
type RegStatus = 'open' | 'few' | 'full';

interface StatusMeta {
  badge: Record<Locale, string>;
  footer: Record<Locale, string>;
  pill: string;
  dot: string;
}

const STATUS: Record<RegStatus, StatusMeta> = {
  open: {
    badge: { he: 'פנוי', en: 'Open' },
    footer: { he: 'ההרשמה פתוחה', en: 'Registration open' },
    pill: 'bg-emerald-500/85 text-white',
    dot: 'bg-emerald-400',
  },
  few: {
    badge: { he: 'כמעט מלא', en: 'Almost full' },
    footer: { he: 'מעט מקומות נותרו', en: 'Few seats left' },
    pill: 'bg-amber-300/90 text-amber-950',
    dot: 'bg-amber-500',
  },
  full: {
    badge: { he: 'מלא', en: 'Full' },
    footer: { he: 'ההרשמה נסגרה', en: 'Registration closed' },
    pill: 'bg-rose-500/85 text-white',
    dot: 'bg-rose-400',
  },
};

const statusFor = (registered: number, capacity: number): RegStatus => {
  if (capacity <= 0) return 'open';
  if (registered >= capacity) return 'full';
  return registered / capacity >= 0.8 ? 'few' : 'open';
};

const ChevronLeft = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M15 6l-6 6 6 6" />
  </svg>
);

const ChevronRight = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M9 6l6 6-6 6" />
  </svg>
);

const RegistrationFooter = ({
  registered,
  capacity,
  locale,
  reduce,
}: {
  registered: number;
  capacity: number;
  locale: Locale;
  reduce: boolean | null;
}) => {
  const status = statusFor(registered, capacity);
  const meta = STATUS[status];
  const pct = capacity > 0 ? Math.min(100, Math.round((registered / capacity) * 100)) : 0;

  return (
    <div className="mt-auto border-t border-white/8 pt-3.5">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-text-secondary">
          {locale === 'he' ? 'רשומים' : 'Registered'}
        </span>
        <span className="font-display text-sm font-semibold tabular-nums text-text-primary">
          {registered} / {capacity}
        </span>
      </div>

      {/* Thin gold occupancy bar */}
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-accent"
          initial={reduce ? false : { width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}
        />
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <span className={`size-2 flex-none rounded-full ${meta.dot}`} />
        <span className="text-xs text-text-secondary">{meta.footer[locale]}</span>
      </div>
    </div>
  );
};

const SessionCard = ({
  session,
  locale,
  reduce,
}: {
  session: FeaturedSession;
  locale: Locale;
  reduce: boolean | null;
}) => {
  const hasReg =
    typeof session.capacity === 'number' &&
    session.capacity > 0 &&
    typeof session.registered === 'number';
  const badgeStatus = hasReg
    ? statusFor(session.registered as number, session.capacity as number)
    : null;

  return (
    <article className="group relative flex h-full w-full flex-col overflow-hidden rounded-2xl bg-white/[0.03] shadow-[0_16px_44px_-26px_rgba(0,0,0,0.7)] ring-1 ring-white/10 transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-[0_34px_70px_-28px_rgba(0,0,0,0.8)] hover:ring-white/20">
      {/* Image — the card's lead */}
      <div className="relative aspect-[16/11] overflow-hidden">
        {session.image ? (
          <Image
            src={session.image}
            alt=""
            fill
            sizes="18rem"
            className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.05]"
          />
        ) : (
          <SessionCover
            seed={session.id}
            className="transition-transform duration-200 ease-out group-hover:scale-[1.05]"
          />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface/45 to-transparent" />

        {/* Time badge — top-left */}
        {session.time ? (
          <span className="absolute left-3 top-3 rounded-lg bg-black/45 px-2.5 py-1 font-display text-sm font-bold text-white/95 backdrop-blur-md">
            {session.time}
          </span>
        ) : null}

        {/* Availability badge — top-right, understood before anything else */}
        {badgeStatus ? (
          <span
            className={`absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium shadow-[0_6px_18px_-6px_rgba(0,0,0,0.55)] backdrop-blur-sm ${STATUS[badgeStatus].pill}`}
          >
            <span className="size-1.5 rounded-full bg-current opacity-80" />
            {STATUS[badgeStatus].badge[locale]}
          </span>
        ) : null}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-3.5 p-5">
        <h3 className="line-clamp-2 font-display text-lg font-bold leading-snug text-text-primary">
          {session.title}
        </h3>

        <div className="flex items-center justify-between gap-3">
          {session.speaker ? (
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="grid size-8 flex-none place-items-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                {session.speaker.slice(0, 1)}
              </span>
              <span className="truncate text-sm text-text-secondary">
                {session.speaker}
              </span>
            </div>
          ) : (
            <span />
          )}
          {session.typeLabel ? (
            <span
              className={`flex-none rounded-full border px-3 py-1 text-xs font-medium ${typeStyle(
                session.typeLabel,
              )}`}
            >
              {session.typeLabel}
            </span>
          ) : null}
        </div>

        {hasReg ? (
          <RegistrationFooter
            registered={session.registered as number}
            capacity={session.capacity as number}
            locale={locale}
            reduce={reduce}
          />
        ) : null}
      </div>
    </article>
  );
};

/*
 * The highlights of the conference as featured stories: a rail of
 * premium, image-led content cards — a time, a title, a voice, and live
 * availability — that feels like browsing curated content, not a
 * schedule. The rail almost spans the full width and overflows naturally.
 * Everything is drawn from the CMS.
 */
const FeaturedSessionsScene = ({
  sessions,
  locale,
}: FeaturedSessionsSceneProps) => {
  const railRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  if (sessions.length === 0) {
    return null;
  }

  const scrollRail = (direction: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
    const amount = Math.min(el.clientWidth * 0.8, 640);
    // RTL: the list extends to the physical left, so "next" decreases scrollLeft.
    el.scrollBy({ left: direction * amount, behavior: 'smooth' });
  };

  return (
    <section
      id="featured-sessions"
      className="relative overflow-hidden pt-2 pb-16 md:pt-4 md:pb-20"
    >
      {/* Subtle warm light behind the rail */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/3 mx-auto h-[420px] max-w-[1200px] bg-[radial-gradient(50%_50%_at_50%_50%,color-mix(in_srgb,var(--color-accent)_8%,transparent),transparent_70%)] blur-2xl"
      />

      <div className="relative mx-auto max-w-[1600px] px-6 md:px-12">
        {/* Header — full-program link (left), title (center), controls (right) */}
        <div className="mb-9 grid grid-cols-1 items-center gap-5 md:mb-12 md:grid-cols-3">
          <div className="hidden md:flex md:items-center md:justify-start md:gap-3">
            <button
              type="button"
              onClick={() => scrollRail(1)}
              aria-label={locale === 'he' ? 'הקודם' : 'Previous'}
              className="grid size-11 place-items-center rounded-full border border-accent/40 text-accent transition-colors duration-200 hover:bg-accent/10"
            >
              <ChevronRight className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollRail(-1)}
              aria-label={locale === 'he' ? 'הבא' : 'Next'}
              className="grid size-11 place-items-center rounded-full border border-accent/40 text-accent transition-colors duration-200 hover:bg-accent/10"
            >
              <ChevronLeft className="size-4" />
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm font-medium uppercase tracking-[0.32em] text-accent">
              {CINEMATIC_UI.featuredSessionsEyebrow[locale]}
            </p>
            <RevealText
              as="h2"
              text={CINEMATIC_UI.featuredSessionsTitle[locale]}
              className="mt-3 block font-display text-3xl font-extrabold tracking-tight md:text-4xl"
            />
          </div>

          <div className="flex justify-center md:justify-end">
            <Link
              href={`/${locale}/program`}
              className="group inline-flex items-center gap-2 text-sm text-accent transition-colors hover:text-text-primary md:text-base"
            >
              <span className="transition-transform duration-200 group-hover:-translate-x-1">
                ←
              </span>
              {CINEMATIC_UI.viewFullProgram[locale]}
            </Link>
          </div>
        </div>

        {/* Rail */}
        <motion.div
          ref={railRef}
          initial={reduce ? false : 'hidden'}
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={railContainer}
          className="scrollbar-none flex snap-x snap-mandatory items-stretch gap-5 overflow-x-auto pb-2"
        >
          {sessions.map((session) => (
            <motion.div
              key={session.id}
              variants={cardItem}
              className="w-[16.5rem] flex-none snap-start sm:w-[17.5rem]"
            >
              <Link
                href={`/${locale}/program?activity=${session.id}`}
                className="block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/30"
                aria-label={session.title}
              >
                <SessionCard session={session} locale={locale} reduce={reduce} />
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturedSessionsScene;
