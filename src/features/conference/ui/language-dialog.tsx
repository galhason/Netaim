'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Locale } from '@/config/locales';
import type { VoteOptionVM } from '../types';
import { IconClose } from './icons';

/*
 * The one question a vote asks: which language do you want? A short
 * list, one choice, one button. It belongs to a form that lives
 * elsewhere on the page — the registration form, or the "change my
 * vote" form — and joins it by the form's id, so the dialog can be
 * drawn at the body (where no card can clip it) and still submit as
 * part of that form.
 */
interface Props {
  formId: string;
  options: VoteOptionVM[];
  /* What is chosen now, if anything — pre-selected. */
  current?: VoteOptionVM;
  /* The word on the button: "הרשמה" when registering, "שמירה" when changing. */
  confirmLabel: string;
  title: string;
  locale: Locale;
  onClose: () => void;
}

const COPY = {
  lead: {
    he: 'הפעילות תתקיים בשפה אחת, לפי בחירת הנרשמים. בחרו את השפה שתרצו.',
    en: 'The activity is held in one language, chosen by its registrants. Pick the one you would like.',
  },
  cancel: { he: 'ביטול', en: 'Cancel' },
  close: { he: 'סגירה', en: 'Close' },
};

const LanguageDialog = ({ formId, options, current, confirmLabel, title, locale, onClose }: Props) => {
  const titleId = useId();
  const [chosen, setChosen] = useState<string>(current?.value ?? '');
  const first = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    first.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[120] grid place-items-center bg-[var(--nt-dark)]/60 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[380px] rounded-[var(--nt-r-xl)] bg-[var(--nt-surface)] p-5 text-[var(--nt-ink)] shadow-[var(--nt-shadow-float)]">
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="font-display text-lg font-bold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={COPY.close[locale]}
            className="-me-1 grid size-8 flex-none place-items-center rounded-full text-[var(--nt-ink-soft)] hover:bg-[var(--nt-raise)]"
          >
            <IconClose className="size-4" />
          </button>
        </div>
        <p className="mt-1 text-sm text-[var(--nt-ink-soft)]">{COPY.lead[locale]}</p>

        <ul className="mt-4 flex flex-col gap-2">
          {options.map((option, index) => (
            <li key={option.value}>
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-[var(--nt-r-md)] border px-4 py-3 text-sm transition-colors ${
                  chosen === option.value
                    ? 'border-[var(--nt-green)] bg-[var(--nt-green-wash)] font-semibold'
                    : 'border-[var(--nt-border)] hover:bg-[var(--nt-raise)]'
                }`}
              >
                <input
                  ref={index === 0 ? first : undefined}
                  type="radio"
                  name="language"
                  value={option.value}
                  form={formId}
                  checked={chosen === option.value}
                  onChange={() => setChosen(option.value)}
                  required
                  className="size-4 accent-[var(--nt-green)]"
                />
                {option.label}
              </label>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 rounded-[var(--nt-r-pill)] px-4 text-sm font-medium text-[var(--nt-ink-soft)] transition-colors hover:bg-[var(--nt-raise)]"
          >
            {COPY.cancel[locale]}
          </button>
          <button
            type="submit"
            form={formId}
            disabled={chosen === ''}
            className="min-h-10 rounded-[var(--nt-r-pill)] bg-[var(--nt-green)] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default LanguageDialog;
