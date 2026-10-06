'use client';

import { useEffect, useId, useRef, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import type { Locale } from '@/config/locales';

/*
 * The full wording of the photography and media consent, opened from
 * "read more" beside the box on the registration form.
 *
 * A dialog in the proper sense: drawn over the page, so the form under
 * it keeps every value typed; the focus moves into it and stays there,
 * the page behind it is held still, and Escape, the close button or the
 * backdrop close it and hand the focus back to the button that opened
 * it. Drawn into the body rather than inside the form, so no card or
 * stacking context on the way can clip it or slide it under a bar.
 */
interface MediaConsentDialogProps {
  locale: Locale;
  onClose: () => void;
  /* What had the focus before — it gets it back on close. */
  returnFocusTo: RefObject<HTMLElement | null>;
  title: string;
  paragraphs: readonly string[];
  affirm: string;
  closeLabel: string;
}

const FOCUSABLE = 'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

const MediaConsentDialog = ({
  locale,
  onClose,
  returnFocusTo,
  title,
  paragraphs,
  affirm,
  closeLabel,
}: MediaConsentDialogProps) => {
  const box = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    const opener = returnFocusTo.current;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => box.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus());
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'Tab' && box.current) {
        const items = [...box.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
        const first = items[0];
        const last = items[items.length - 1];
        if (!first || !last) {
          return;
        }
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
      requestAnimationFrame(() => opener?.focus());
    };
  }, [onClose, returnFocusTo]);

  return createPortal(
    <div
      className="experience fixed inset-0 z-[90] grid place-items-center p-4"
      dir={locale === 'he' ? 'rtl' : 'ltr'}
      lang={locale}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label={closeLabel}
        onClick={onClose}
        className="absolute inset-0 bg-[rgb(11_27_51/0.42)] backdrop-blur-[2px]"
      />
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-[var(--x-r-card)] bg-[var(--x-surface)] text-start shadow-[var(--x-shadow-lift)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--x-line)] px-5 py-4 md:px-6">
          <h2 id={titleId} className="font-display text-lg font-bold leading-snug text-[var(--x-ink)]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="grid size-9 flex-none place-items-center rounded-full text-[var(--x-soft)] transition-colors hover:bg-[var(--x-raise)] hover:text-[var(--x-ink)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--x-ring)]"
          >
            <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>
        <div id={bodyId} className="overflow-y-auto px-5 py-4 text-[15px] leading-relaxed text-[var(--x-soft)] md:px-6">
          {paragraphs.map((paragraph) => (
            <p key={paragraph} className="mt-3 first:mt-0">
              {paragraph}
            </p>
          ))}
          <p className="mt-4 rounded-[var(--x-r-field)] bg-[var(--x-raise)] px-4 py-3 text-sm font-medium text-[var(--x-ink)] ring-1 ring-[var(--x-line)]">
            {affirm}
          </p>
        </div>
        <div className="flex justify-end border-t border-[var(--x-line)] px-5 py-3 md:px-6">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--x-r-field)] bg-[var(--x-primary)] px-6 text-sm font-semibold text-white transition-colors hover:bg-[var(--x-primary-strong)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--x-ring)]"
          >
            {closeLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default MediaConsentDialog;
