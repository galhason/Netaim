'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { SVGProps } from 'react';
import type { Locale } from '@/config/locales';
import { IconClose } from '@/features/conference';

export interface NoticeVM {
  id: string;
  text: string;
  actionLabel?: string;
  activityId?: string;
}

interface Props {
  items: NoticeVM[];
  locale: Locale;
  onAction: (activityId: string) => void;
}

const IconBell = (p: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...p}
  >
    <path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6" />
    <path d="M13.7 20a2 2 0 0 1-3.4 0" />
  </svg>
);

/*
 * The one line that follows you down the page. It carries only what is
 * time-critical — the lecture about to start, the room that moved, the
 * registration that came through — and it can always be dismissed. On a
 * phone it sits above the thumb, which is where the participant is
 * already looking when they are deciding whether to get up.
 */
const NotificationBar = ({ items, locale, onAction }: Props) => {
  const he = locale === 'he';
  const reduce = useReducedMotion();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const notice = items.find((item) => !dismissed.includes(item.id));

  return (
    <AnimatePresence>
      {notice ? (
        <motion.div
          key={notice.id}
          initial={reduce ? false : { y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { y: 24, opacity: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <div className="pointer-events-auto mx-auto flex max-w-3xl items-center gap-3 rounded-[var(--x-r-pill)] bg-[var(--x-navy)] px-4 py-2.5 text-white shadow-[var(--x-shadow-drawer)]">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/10 text-[var(--x-primary-wash)]">
              <IconBell className="size-4" />
            </span>
            <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-white/90">
              {notice.text}
            </p>
            {notice.activityId ? (
              <button
                type="button"
                onClick={() => onAction(notice.activityId as string)}
                className="hidden shrink-0 rounded-[var(--x-r-pill)] bg-white px-3 py-1.5 text-[12px] font-semibold text-[var(--x-navy-deep)] transition-colors hover:bg-[var(--x-primary-wash)] sm:inline-flex"
              >
                {notice.actionLabel ?? (he ? 'הצג' : 'View')}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setDismissed((prev) => [...prev, notice.id])}
              aria-label={he ? 'סגירת ההתראה' : 'Dismiss notification'}
              className="grid size-8 shrink-0 place-items-center rounded-full text-white/55 transition-colors hover:bg-white/10 hover:text-white"
            >
              <IconClose className="size-4" />
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default NotificationBar;
