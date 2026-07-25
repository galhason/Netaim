'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import type { Locale } from '@/config/locales';
import type { ActivityVM } from '../types';
import {
  AvailabilityBadge,
  RegistrationButton,
  TypePill,
  surface,
} from '../ui/kit';
import {
  IconArrow,
  IconCalendar,
  IconClock,
  IconClose,
  IconLink,
  IconPin,
  IconShare,
  IconStar,
  IconStarFilled,
} from '../ui/icons';
import { Modal, useToast } from '../ui/feedback';
import { useFavorites } from '../ui/favorites';
import SpeakerCard from './speaker-card';

interface Props {
  activity: ActivityVM | null;
  related?: ActivityVM[];
  onOpenRelated?: (id: string) => void;
  locale: Locale;
  slug: string;
  onClose: () => void;
  registerAction: (formData: FormData) => void | Promise<void>;
  leaveAction: (formData: FormData) => void | Promise<void>;
}

const fullDate = (dayKey: string, locale: Locale): string => {
  const d = new Date(`${dayKey}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(d);
};

const CAP_FILL: Record<string, string> = {
  available: 'bg-[var(--x-ok)]',
  almostFull: 'bg-[var(--x-warn)]',
  full: 'bg-[var(--x-full)]',
  waitlist: 'bg-[var(--x-wait)]',
};

/* The registration widget — capacity, status and the action in one card. */
const RegistrationPanel = ({
  activity,
  locale,
  slug,
  registerAction,
  leaveAction,
}: {
  activity: ActivityVM;
  locale: Locale;
  slug: string;
  registerAction: (formData: FormData) => void | Promise<void>;
  leaveAction: (formData: FormData) => void | Promise<void>;
}) => {
  const he = locale === 'he';
  const { confirmed, waiting, limit } = activity.capacity;
  const remaining = limit != null ? Math.max(0, limit - confirmed) : null;
  const pct =
    limit != null ? Math.min(100, Math.round((confirmed / Math.max(1, limit)) * 100)) : 0;
  const stats = [
    { label: he ? 'רשומים' : 'Registered', value: confirmed },
    { label: he ? 'רשימת המתנה' : 'Waiting list', value: waiting },
    { label: he ? 'מקומות פנויים' : 'Seats left', value: remaining ?? '∞' },
  ];
  return (
    <div className="rounded-[var(--x-r-card)] border border-[var(--x-line)] bg-[var(--x-raise)] p-4">
      <div className="flex items-center justify-between gap-3">
        <AvailabilityBadge
          status={activity.status}
          confirmed={confirmed}
          limit={limit}
          locale={locale}
          showCount={false}
        />
        <div className="min-w-[140px]">
          <RegistrationButton
            state={activity.registration}
            locale={locale}
            slug={slug}
            sessionId={activity.id}
            registerAction={registerAction}
            leaveAction={leaveAction}
            block
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {stats.map((s) => (
          <div key={s.label} className="rounded-[var(--x-r-field)] bg-[var(--x-surface)] py-2.5">
            <p className="font-display text-xl font-bold tabular-nums text-[var(--x-ink)]">
              {s.value}
            </p>
            <p className="mt-0.5 text-[11px] leading-tight text-[var(--x-soft)]">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {limit != null ? (
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs">
            <span className="font-semibold tabular-nums text-[var(--x-ink)]">
              {confirmed} / {limit}
            </span>
            <span className="tabular-nums text-[var(--x-faint)]">{pct}%</span>
          </div>
          <span className="block h-2 w-full overflow-hidden rounded-full bg-[var(--x-line)]">
            <span
              className={`block h-full rounded-full transition-[width] duration-500 ${CAP_FILL[activity.status]}`}
              style={{ width: `${Math.max(3, pct)}%` }}
            />
          </span>
        </div>
      ) : null}

      {activity.registration === 'registered' ? (
        <p className="mt-3 text-xs text-[var(--x-faint)]">
          {he
            ? 'ניתן לבטל את ההרשמה בכל עת מהאזור האישי.'
            : 'You can cancel anytime from your personal area.'}
        </p>
      ) : null}
    </div>
  );
};

const ShareModal = ({
  open,
  onClose,
  url,
  title,
  locale,
  onCopy,
}: {
  open: boolean;
  onClose: () => void;
  url: string;
  title: string;
  locale: Locale;
  onCopy: () => void;
}) => {
  const he = locale === 'he';
  const enc = encodeURIComponent(url);
  const encT = encodeURIComponent(title);
  const links = [
    { label: 'WhatsApp', href: `https://wa.me/?text=${encT}%20${enc}`, tone: 'text-[#25D366]' },
    { label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc}`, tone: 'text-[#0A66C2]' },
    {
      label: he ? 'אימייל' : 'Email',
      href: `mailto:?subject=${encT}&body=${enc}`,
      tone: 'text-[var(--x-soft)]',
    },
  ];
  return (
    <Modal open={open} onClose={onClose} title={he ? 'שיתוף הפעילות' : 'Share activity'}>
      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={onCopy}
          className="flex items-center gap-3 rounded-[var(--x-r-field)] border border-[var(--x-line)] px-4 py-3 text-start text-sm font-medium text-[var(--x-ink)] transition-colors hover:border-[var(--x-primary)] hover:bg-[var(--x-primary-wash)]"
        >
          <IconLink className="size-5 text-[var(--x-primary)]" />
          {he ? 'העתקת קישור' : 'Copy link'}
        </button>
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-[var(--x-r-field)] border border-[var(--x-line)] px-4 py-3 text-sm font-medium text-[var(--x-ink)] transition-colors hover:border-[var(--x-primary)] hover:bg-[var(--x-primary-wash)]"
          >
            <IconShare className={`size-5 ${l.tone}`} />
            {l.label}
          </a>
        ))}
      </div>
    </Modal>
  );
};

/*
 * Opening an activity never leaves the page. On desktop the full details
 * rise in a right-hand panel; on mobile the same panel is a bottom sheet.
 * It reads like a product page — hero, facts, registration, description,
 * speakers, and paths onward — designed for discovery, never a dead end.
 */
const ActivityDrawer = ({
  activity,
  related = [],
  onOpenRelated,
  locale,
  slug,
  onClose,
  registerAction,
  leaveAction,
}: Props) => {
  const reduce = useReducedMotion();
  const toast = useToast();
  const he = locale === 'he';
  const favorites = useFavorites();
  const fav = activity ? favorites.has(activity.id) : false;
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (!activity) return;
    setShareOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [activity, onClose]);

  const from = he ? -28 : 28;
  const shareUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/${locale}/program` : '';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.show(he ? 'הקישור הועתק' : 'Link copied', 'info');
      setShareOpen(false);
    } catch {
      toast.show(he ? 'לא ניתן להעתיק' : 'Could not copy', 'warn');
    }
  };

  const coverBtn =
    'grid size-9 place-items-center rounded-full bg-white/90 text-[var(--x-ink)] shadow-sm backdrop-blur transition-transform hover:scale-105 hover:bg-white';

  return (
    <>
      <AnimatePresence>
        {activity ? (
          <motion.div
            className="fixed inset-0 z-[60] flex"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
          >
            <button
              type="button"
              aria-label={he ? 'סגירה' : 'Close'}
              onClick={onClose}
              className="absolute inset-0 bg-[rgba(14,27,46,0.4)] backdrop-blur-[3px]"
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label={activity.title}
              initial={reduce ? { opacity: 0 } : { x: from, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={reduce ? { opacity: 0 } : { x: from, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="experience relative z-10 mt-auto flex max-h-[93vh] w-full flex-col overflow-hidden rounded-t-[24px] bg-[var(--x-surface)] shadow-[var(--x-shadow-drawer)] sm:mt-0 sm:h-full sm:max-h-none sm:ms-auto sm:w-[460px] sm:rounded-none lg:w-[42vw] lg:max-w-[620px]"
            >
              {/* Hero */}
              <div
                className="relative flex-none overflow-hidden px-6 pb-5 pt-6"
                style={{
                  background:
                    'radial-gradient(120% 160% at 100% 0%, rgba(110,86,207,0.45), transparent 55%), radial-gradient(90% 120% at 0% 100%, rgba(43,58,110,0.55), transparent 60%), linear-gradient(135deg, #1b2946, #0d1626)',
                }}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-[0.15]"
                  style={{
                    backgroundImage:
                      'radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)',
                    backgroundSize: '18px 18px',
                  }}
                />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={he ? 'שיתוף' : 'Share'}
                      onClick={() => setShareOpen(true)}
                      className={coverBtn}
                    >
                      <IconShare className="size-5" />
                    </button>
                    <button
                      type="button"
                      aria-label={he ? 'מועדף' : 'Favorite'}
                      aria-pressed={fav}
                      onClick={() => {
                        const on = favorites.toggle(activity.id);
                        toast.show(
                          on
                            ? he ? 'נוסף למועדפים' : 'Added to favorites'
                            : he ? 'הוסר מהמועדפים' : 'Removed from favorites',
                          'success',
                        );
                      }}
                      className={`${coverBtn} ${fav ? 'text-[var(--x-primary)]' : ''}`}
                    >
                      {fav ? <IconStarFilled className="size-5" /> : <IconStar className="size-5" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label={he ? 'סגירה' : 'Close'}
                    className={coverBtn}
                  >
                    <IconClose className="size-5" />
                  </button>
                </div>

                <div className="relative mt-8">
                  <TypePill type={activity.type} label={activity.typeLabel} />
                  <h2 className="mt-2.5 font-display text-2xl font-bold leading-tight tracking-tight text-white md:text-[26px]">
                    {activity.title}
                  </h2>
                  {/* Info strip */}
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-white/75">
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      <IconCalendar className="size-4 text-white/60" />
                      {fullDate(activity.dayKey, locale)}
                    </span>
                    {activity.time ? (
                      <span className="inline-flex items-center gap-1.5 text-sm tabular-nums">
                        <IconClock className="size-4 text-white/60" />
                        {activity.time}
                        {activity.endTime ? `–${activity.endTime}` : ''}
                        {activity.duration ? ` · ${activity.duration}` : ''}
                      </span>
                    ) : null}
                    {activity.room ? (
                      <span className="inline-flex items-center gap-1.5 text-sm">
                        <IconPin className="size-4 text-white/60" />
                        {activity.room}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Scroll body */}
              <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
                <RegistrationPanel
                  activity={activity}
                  locale={locale}
                  slug={slug}
                  registerAction={registerAction}
                  leaveAction={leaveAction}
                />

                {activity.description || activity.language ? (
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--x-faint)]">
                      {he ? 'על הפעילות' : 'About'}
                    </h3>
                    {activity.description ? (
                      <p className="text-[15px] leading-relaxed text-[var(--x-soft)]">
                        {activity.description}
                      </p>
                    ) : null}
                    {activity.language ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-[var(--x-r-pill)] bg-[var(--x-raise)] px-3 py-1 text-xs text-[var(--x-soft)]">
                          {he ? 'שפה' : 'Language'}: {activity.language}
                        </span>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {activity.speakers.length > 0 ? (
                  <div>
                    <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--x-faint)]">
                      {activity.speakers.length > 1
                        ? he ? 'הדוברים' : 'Speakers'
                        : he ? 'הדובר' : 'Speaker'}
                    </h3>
                    <div className="flex flex-col gap-2.5">
                      {activity.speakers.map((sp) => (
                        <SpeakerCard key={sp.id} speaker={sp} locale={locale} />
                      ))}
                    </div>
                  </div>
                ) : null}

                {related.length > 0 ? (
                  <div>
                    <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--x-faint)]">
                      {he ? 'אולי יעניין אותך גם' : 'You may also be interested in'}
                    </h3>
                    <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-1 sm:px-0">
                      {related.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => onOpenRelated?.(r.id)}
                          className={`${surface} flex min-w-[220px] flex-col gap-2 border border-[var(--x-line)] p-3.5 text-start transition-all hover:-translate-y-0.5 hover:border-[var(--x-primary)]/30 hover:shadow-[var(--x-shadow-lift)] sm:min-w-0 sm:flex-row sm:items-center`}
                        >
                          <span className="sm:w-14 sm:flex-none">
                            <TypePill type={r.type} label={r.typeLabel} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-[var(--x-ink)]">
                              {r.title}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-[var(--x-faint)]">
                              {r.time}
                              {r.room ? ` · ${r.room}` : ''}
                            </span>
                          </span>
                          <IconArrow className="hidden size-4 flex-none text-[var(--x-faint)] rtl:-scale-x-100 sm:block" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Sticky action — mobile reachability */}
              <div className="flex-none border-t border-[var(--x-line)] bg-[var(--x-surface)] p-4 sm:hidden">
                <RegistrationButton
                  state={activity.registration}
                  locale={locale}
                  slug={slug}
                  sessionId={activity.id}
                  registerAction={registerAction}
                  leaveAction={leaveAction}
                  block
                />
              </div>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {activity ? (
        <ShareModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          url={shareUrl}
          title={activity.title}
          locale={locale}
          onCopy={copyLink}
        />
      ) : null}
    </>
  );
};

export default ActivityDrawer;
