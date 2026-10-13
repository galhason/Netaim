'use client';

import { useState, type InputHTMLAttributes } from 'react';
import type { Locale } from '@/config/locales';

/*
 * A password field a person can read back.
 *
 * Dots hide a typo as well as they hide the password, and a typo here
 * costs more than anywhere else on the form: it locks the person out
 * of the account they have just made. So the field carries its own
 * switch — an eye and a word — that shows the characters for as long
 * as the person wants them shown. Off again on its own never; a person
 * who turned it on is looking, and a form that hides their password
 * mid-word is not helping. Nothing about the field's name, value or
 * validation changes with the switch: the form sees the same input.
 */
const WORDS = {
  show: { he: 'הצגה', en: 'Show' },
  hide: { he: 'הסתרה', en: 'Hide' },
  showLabel: { he: 'הצגת הסיסמה', en: 'Show the password' },
  hideLabel: { he: 'הסתרת הסיסמה', en: 'Hide the password' },
} as const;

const EyeIcon = ({ open }: { open: boolean }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3" />
    {open ? null : <path d="M4 4l16 16" />}
  </svg>
);

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  locale: Locale;
}

export const PasswordField = ({ locale, className, ...input }: Props) => {
  const [shown, setShown] = useState(false);
  const toggle = () => setShown((value) => !value);
  /*
   * A password reads left to right whatever the page does, like an
   * address — otherwise a shown "Abc123!" comes out with its symbols
   * shuffled on a Hebrew page. The switch sits at the page's end, so
   * the room kept for it is on the page's side, not the input's.
   */
  const room = locale === 'he' ? 'pl-24' : 'pr-24';
  return (
    <div className="relative">
      <input dir="ltr" {...input} type={shown ? 'text' : 'password'} className={`${className ?? ''} ${room}`} />
      <button
        type="button"
        onClick={toggle}
        aria-pressed={shown}
        aria-label={shown ? WORDS.hideLabel[locale] : WORDS.showLabel[locale]}
        title={shown ? WORDS.hideLabel[locale] : WORDS.showLabel[locale]}
        className="absolute inset-y-0 end-0 inline-flex items-center gap-1.5 px-3.5 text-xs font-medium text-[var(--x-soft)] transition-colors hover:text-[var(--x-ink)] focus-visible:text-[var(--x-ink)] focus-visible:outline-none"
      >
        <EyeIcon open={shown} />
        <span>{shown ? WORDS.hide[locale] : WORDS.show[locale]}</span>
      </button>
    </div>
  );
};
