'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import type { Locale } from '@/config/locales';
import type { ActivityVM } from '../types';
import {
  AvailabilityBadge,
  AvatarGroup,
  CapacityBar,
  RegistrationButton,
  TypePill,
  surface,
} from '../ui/kit';
import { IconClock, IconPin, IconShare, IconStar, IconStarFilled } from '../ui/icons';
import { useToast } from '../ui/feedback';

interface Props {
  activity: ActivityVM;
  locale: Locale;
  slug: string;
  onOpen: (id: string) => void;
  registerAction: (formData: FormData) => void | Promise<void>;
  leaveAction: (formData: FormData) => void | Promise<void>;
  index?: number;
}

const timeRange = (a: ActivityVM): string => {
  if (!a.time) return '';
  const range = a.endTime ? `${a.time}–${a.endTime}` : a.time;
  return a.duration ? `${range} · ${a.duration}` : range;
};

const speakerLine = (a: ActivityVM): string => {
  const first = a.speakers[0];
  if (!first) return '';
  return [first.role, first.company].filter(Boolean).join(' · ');
};

/*
 * One activity, docked to its time. The whole card opens the details
 * drawer; favourite, share and the registration control act on their own
 * and never trigger it. Information reads top-down in the order a
 * participant asks it: what, who says it, is there room, can I join.
 */
const ActivityCard = ({
  activity,
  locale,
  slug,
  onOpen,
  registerAction,
  leaveAction,
  index = 0,
}: Props) => {
  const reduce = useReducedMotion();
  const toast = useToast();
  const he = locale === 'he';
  const [fav, setFav] = useState(false);

  const open = () => onOpen(activity.id);
  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

  const toggleFav = () => {
    setFav((v) => !v);
    toast.show(
      !fav
        ? he
          ? 'נוסף למועדפים'
          : 'Added to favorites'
        : he
          ? 'הוסר מהמועדפים'
          : 'Removed from favorites',
      'success',
    );
  };
  const share = async () => {
    const url = `${window.location.origin}/${locale}/program`;
    try {
      await navigator.clipboard.writeText(url);
      toast.show(he ? 'הקישור הועתק' : 'Link copied', 'info');
    } catch {
      toast.show(he ? 'לא ניתן להעתיק' : 'Could not copy', 'warn');
    }
  };

  if (activity.type === 'break') {
    return (
      <div
        className={`${surface} flex items-center gap-3 border border-[var(--x-line)] bg-[var(--x-raise)] px-5 py-3`}
      >
        <span className="grid size-8 flex-none place-items-center rounded-full bg-[var(--x-primary-wash)] text-[var(--x-primary)]">
          <IconClock className="size-4" />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-medium text-[var(--x-ink)]">
            {activity.title}
          </span>
          {activity.description ? (
            <span className="block text-xs text-[var(--x-soft)]">
              {activity.description}
            </span>
          ) : null}
        </span>
        {activity.room ? (
          <span className="flex items-center gap-1.5 text-xs text-[var(--x-soft)]">
            <IconPin className="size-4" />
            {activity.room}
          </span>
        ) : null}
      </div>
    );
  }

  const iconBtn =
    'grid size-8 place-items-center rounded-lg text-[var(--x-faint)] transition-colors hover:bg-[var(--x-raise)] hover:text-[var(--x-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--x-primary)]';

  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: Math.min(index, 6) * 0.035 }}
      className={`${surface} group border border-[var(--x-line)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--x-primary)]/25 hover:shadow-[var(--x-shadow-lift)]`}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={activity.title}
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            open();
          }
        }}
        className="cursor-pointer rounded-[var(--x-r-card)] p-4 outline-none focus-visible:ring-2 focus-visible:ring-[var(--x-primary)] md:p-5"
      >
        {/* Row 1: type + quick actions */}
        <div className="flex items-start justify-between gap-3">
          <TypePill type={activity.type} label={activity.typeLabel} />
          <div className="-me-1 flex items-center gap-0.5 opacity-0 transition-opacity duration-200 focus-within:opacity-100 group-hover:opacity-100">
            <button
              type="button"
              aria-label={he ? 'מועדף' : 'Favorite'}
              aria-pressed={fav}
              onClick={(e) => {
                stop(e);
                toggleFav();
              }}
              className={`${iconBtn} ${fav ? 'text-[var(--x-primary)]' : ''}`}
            >
              {fav ? <IconStarFilled className="size-4" /> : <IconStar className="size-4" />}
            </button>
            <button
              type="button"
              aria-label={he ? 'שיתוף' : 'Share'}
              onClick={(e) => {
                stop(e);
                void share();
              }}
              className={iconBtn}
            >
              <IconShare className="size-4" />
            </button>
          </div>
        </div>

        {/* Title + description */}
        <h3 className="mt-2.5 font-display text-lg font-bold leading-snug tracking-tight text-[var(--x-ink)]">
          {activity.title}
        </h3>
        {activity.description ? (
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-[var(--x-soft)]">
            {activity.description}
          </p>
        ) : null}

        {/* Meta: time · duration · room */}
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--x-soft)]">
          {timeRange(activity) ? (
            <span className="inline-flex items-center gap-1.5">
              <IconClock className="size-3.5 text-[var(--x-faint)]" />
              <span className="tabular-nums">{timeRange(activity)}</span>
            </span>
          ) : null}
          {activity.room ? (
            <span className="inline-flex items-center gap-1.5">
              <IconPin className="size-3.5 text-[var(--x-faint)]" />
              {activity.room}
            </span>
          ) : null}
        </div>

        {/* Speakers */}
        {activity.speakers.length > 0 ? (
          <div className="mt-3 flex items-center gap-2.5">
            <AvatarGroup speakers={activity.speakers} size={34} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-[var(--x-ink)]">
                {activity.speakers.map((s) => s.name).join(', ')}
              </span>
              {speakerLine(activity) ? (
                <span className="block truncate text-xs text-[var(--x-faint)]">
                  {speakerLine(activity)}
                </span>
              ) : null}
            </span>
          </div>
        ) : null}

        {/* Footer: capacity + availability + register */}
        <div className="mt-4 flex items-end justify-between gap-4 border-t border-[var(--x-line)] pt-3.5">
          <div className="min-w-0 flex-1">
            {activity.capacity.limit != null ? (
              <div className="max-w-[190px]">
                <CapacityBar
                  confirmed={activity.capacity.confirmed}
                  limit={activity.capacity.limit}
                  status={activity.status}
                  locale={locale}
                />
              </div>
            ) : (
              <AvailabilityBadge
                status={activity.status}
                confirmed={activity.capacity.confirmed}
                limit={activity.capacity.limit}
                locale={locale}
                showCount={false}
              />
            )}
          </div>
          <div onClick={stop} onKeyDown={stop}>
            <RegistrationButton
              state={activity.registration}
              locale={locale}
              slug={slug}
              sessionId={activity.id}
              registerAction={registerAction}
              leaveAction={leaveAction}
              size="sm"
            />
          </div>
        </div>
      </div>
    </motion.article>
  );
};

export default ActivityCard;
