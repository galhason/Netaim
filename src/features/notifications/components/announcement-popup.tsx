'use client';

import { useEffect, useState } from 'react';

/*
 * The pop-up channel (PRD §4.1): an overlay that pauses the page until
 * the guest clicks — then never returns for the same message. The
 * acknowledgment lives on the device, not on the server.
 */
interface AnnouncementPopupProps {
  id: string;
  subject: string;
  body: string;
  approveLabel: string;
}

const keyOf = (id: string): string => `hason-popup-${id}`;

const AnnouncementPopup = ({
  id,
  subject,
  body,
  approveLabel,
}: AnnouncementPopupProps) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      setOpen(!window.localStorage.getItem(keyOf(id)));
    } catch {
      setOpen(true);
    }
  }, [id]);

  const approve = () => {
    try {
      window.localStorage.setItem(keyOf(id), '1');
    } catch {
      /* private browsing — the message will simply return next visit */
    }
    setOpen(false);
  };

  if (!open) {
    return null;
  }

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={subject}
      className="fixed inset-0 z-[95] grid place-items-center bg-[var(--nt-dark-deep)]/70 p-6 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-7 text-center text-[var(--nt-ink)] shadow-[0_30px_90px_rgba(0,0,0,0.4)]">
        <span
          aria-hidden="true"
          className="mx-auto grid size-12 place-items-center rounded-full bg-[var(--nt-orange)]/15 text-xl text-[var(--nt-amber-ink)]"
        >
          !
        </span>
        <h2 className="mt-4 font-display text-2xl font-semibold">{subject}</h2>
        <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--nt-ink-soft)]">
          {body}
        </p>
        <button
          type="button"
          onClick={approve}
          autoFocus
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[var(--nt-navy)] text-sm font-medium text-white transition-colors hover:bg-[var(--nt-dark)]"
        >
          {approveLabel}
        </button>
      </div>
    </div>
  );
};

export default AnnouncementPopup;
