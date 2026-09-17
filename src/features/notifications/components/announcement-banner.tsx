'use client';

import { useEffect, useRef, useState } from 'react';

/*
 * The ticker channel (PRD §4.1): one line from the production pinned
 * above the page. It stays until the guest closes it — and once closed
 * it does not come back for the same message. The dismissal lives on
 * the device, like the pop-up's, so no server round-trip stands between
 * the click and the line disappearing. The message itself is never
 * lost: it keeps its place in Updates.
 */
interface AnnouncementBannerProps {
  id: string;
  subject: string;
  body: string;
  closeLabel: string;
}

const keyOf = (id: string): string => `hason-banner-${id}`;

const AnnouncementBanner = ({
  id,
  subject,
  body,
  closeLabel,
}: AnnouncementBannerProps) => {
  const [open, setOpen] = useState(false);
  const line = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      setOpen(!window.localStorage.getItem(keyOf(id)));
    } catch {
      setOpen(true);
    }
  }, [id]);

  /*
   * The site bar is fixed to the top of the viewport; while this line
   * is showing, the bar must sit under it rather than behind it. The
   * line publishes its own height as a variable the bar reads, and
   * withdraws it when it closes — so nothing else needs to know.
   */
  useEffect(() => {
    const root = document.documentElement;
    if (!open || !line.current) {
      root.style.removeProperty('--announcement-h');
      return;
    }
    const publish = () =>
      root.style.setProperty('--announcement-h', `${line.current?.offsetHeight ?? 0}px`);
    publish();
    const watch = new ResizeObserver(publish);
    watch.observe(line.current);
    return () => {
      watch.disconnect();
      root.style.removeProperty('--announcement-h');
    };
  }, [open]);

  const dismiss = () => {
    try {
      window.localStorage.setItem(keyOf(id), '1');
    } catch {
      /* private browsing — the line will simply return next visit */
    }
    setOpen(false);
  };

  if (!open) {
    return null;
  }

  return (
    <div
      ref={line}
      role="status"
      className="sticky top-0 z-[90] flex items-center justify-center gap-3 bg-[var(--nt-yellow)] px-4 py-2.5 text-center text-sm font-medium text-[var(--nt-ink-on-accent)] shadow-[0_6px_18px_rgba(0,0,0,0.25)]"
    >
      <span
        aria-hidden="true"
        className="size-2 flex-none animate-pulse rounded-full bg-[var(--nt-ink-on-accent)]"
      />
      <span className="min-w-0">
        <strong>{subject}</strong>
        {body ? ` — ${body}` : ''}
      </span>
      <button
        type="button"
        onClick={dismiss}
        aria-label={closeLabel}
        title={closeLabel}
        className="-me-1 ms-1 grid size-8 flex-none place-items-center rounded-full text-[var(--nt-ink-on-accent)] transition-colors hover:bg-[var(--nt-ink-on-accent)]/12 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--nt-ink-on-accent)]"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
};

export default AnnouncementBanner;
