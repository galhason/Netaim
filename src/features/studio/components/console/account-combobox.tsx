'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Locale } from '@/config/locales';
import { searchAccounts } from '../../utils/account-search';

/*
 * Picking one account out of hundreds by typing its name.
 *
 * A <select> with four hundred options is a list to be read; this is a
 * box to be typed in. The first letters of a name bring up the people
 * whose name begins so — "Gal" offers Gal Hason and Gal Or — then the
 * ones that merely contain it, then a match on the organisation or the
 * email (utils/account-search). The choice travels in a hidden input under the form field's
 * own name, so the server action is none the wiser.
 *
 * An ARIA combobox: the arrows walk the list, Enter picks, Escape
 * closes, and a screen reader hears what is offered and what is chosen.
 */
export interface AccountOption {
  accountId: string;
  name: string;
  company?: string;
  jobTitle?: string;
  email?: string;
  photoUrl?: string;
}

interface AccountComboboxProps {
  name: string;
  label: string;
  options: AccountOption[];
  locale: Locale;
  defaultValue?: string;
  className?: string;
}

const COPY = {
  placeholder: { he: 'התחילו להקליד שם…', en: 'Start typing a name…' },
  none: { he: 'לא נמצא חשבון בשם הזה.', en: 'No account by that name.' },
  linked: { he: 'מקושר/ת לחשבון:', en: 'Linked to account:' },
  clear: { he: 'ניקוי', en: 'Clear' },
  hint: { he: 'ריק = דובר/ת חיצוני/ת, בלי חשבון.', en: 'Empty = an external speaker, no account.' },
} as const;

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase() || '?';

const Avatar = ({ option }: { option: AccountOption }) =>
  option.photoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- a portrait from the media API, size unknown at build time
    <img src={option.photoUrl} alt="" className="size-8 shrink-0 rounded-full object-cover" />
  ) : (
    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--c-bronze)]/20 text-[11px] font-semibold text-[var(--c-bronze)]">
      {initials(option.name)}
    </span>
  );

const AccountCombobox = ({ name, label, options, locale, defaultValue = '', className = '' }: AccountComboboxProps) => {
  const id = useId();
  const [chosen, setChosen] = useState<AccountOption | null>(
    () => options.find((option) => option.accountId === defaultValue) ?? null,
  );
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => searchAccounts(options, query), [options, query]);

  useEffect(() => {
    setActive(0);
  }, [matches]);

  /* A click anywhere else closes the list. */
  useEffect(() => {
    if (!open) return undefined;
    const away = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [open]);

  const pick = (option: AccountOption) => {
    setChosen(option);
    setQuery('');
    setOpen(false);
  };

  const onKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((held) => Math.min(held + 1, Math.max(matches.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((held) => Math.max(held - 1, 0));
    } else if (event.key === 'Enter') {
      if (open && matches[active]) {
        event.preventDefault();
        pick(matches[active]);
      }
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  const listId = `${id}-list`;
  const dir = locale === 'he' ? 'rtl' : 'ltr';

  return (
    <div ref={root} className="relative">
      <input type="hidden" name={name} value={chosen?.accountId ?? ''} />
      <label htmlFor={`${id}-input`} className="mb-1 block text-[11px] font-medium tracking-[0.08em] text-[var(--c-text-soft)]">
        {label}
      </label>
      {chosen ? (
        <div className={`${className} flex items-center gap-3`}>
          <Avatar option={chosen} />
          <span className="min-w-0 flex-1 truncate">
            <span className="text-[var(--c-text-faint)]">{COPY.linked[locale]} </span>
            <span className="font-medium">{chosen.name}</span>
            {chosen.company ? <span className="text-[var(--c-text-soft)]"> · {chosen.company}</span> : null}
          </span>
          <button
            type="button"
            onClick={() => setChosen(null)}
            className="shrink-0 rounded-md border border-[var(--c-line-strong)] px-2 py-1 text-xs text-[var(--c-text)] hover:border-[var(--c-bronze)] hover:text-[var(--c-bronze)]"
          >
            {COPY.clear[locale]}
          </button>
        </div>
      ) : (
        <input
          id={`${id}-input`}
          type="text"
          role="combobox"
          autoComplete="off"
          dir={dir}
          value={query}
          placeholder={COPY.placeholder[locale]}
          aria-expanded={open && query.trim() !== ''}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && matches[active] ? `${id}-option-${matches[active].accountId}` : undefined}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          className={className}
        />
      )}
      {!chosen ? <p className="mt-1 text-[11px] text-[var(--c-text-faint)]">{COPY.hint[locale]}</p> : null}
      {!chosen && open && query.trim() !== '' ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-md border border-[var(--c-line-strong)] bg-[var(--c-deep)] p-1 shadow-2xl"
        >
          {matches.length === 0 ? (
            <li className="px-3 py-3 text-center text-xs text-[var(--c-text-faint)]">{COPY.none[locale]}</li>
          ) : (
            matches.map((option, index) => (
              <li
                key={option.accountId}
                id={`${id}-option-${option.accountId}`}
                role="option"
                aria-selected={index === active}
                onMouseEnter={() => setActive(index)}
                onMouseDown={(event) => {
                  event.preventDefault();
                  pick(option);
                }}
                className={`flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 ${
                  index === active ? 'bg-[rgba(255,255,255,0.08)]' : ''
                }`}
              >
                <Avatar option={option} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-[var(--c-text)]">{option.name}</span>
                  {option.jobTitle || option.company || option.email ? (
                    <span className="block truncate text-xs text-[var(--c-text-soft)]">
                      {[option.jobTitle, option.company].filter(Boolean).join(' · ') || option.email}
                    </span>
                  ) : null}
                </span>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
};

export default AccountCombobox;
