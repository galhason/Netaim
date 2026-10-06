'use client';

import { useState, type ChangeEvent } from 'react';
import type { Locale } from '@/config/locales';
import { countriesFor, countryFlag } from '@/shared/constants/countries';
import { dialPlanOf } from '@/shared/constants/dial-codes';
import { splitPhone } from '@/shared/utils/phone';

/*
 * A telephone number with its country's calling code beside it.
 *
 * Two fields that read as one: the calling code — a flag and +972 — and
 * the number, written the way it is written at home. The code is a real
 * <select> laid invisibly over a box that shows the flag and the code,
 * so the list a person opens is the browser's own (searchable by
 * typing, read properly by a screen reader, named in full), while the
 * closed field stays narrow. Both sit left to right in either language,
 * because a telephone number is always read that way.
 *
 * Controlled (the registration form keeps every value in its own state)
 * or uncontrolled from a stored number (the profile screens), in which
 * case the stored number is split back into its code and its digits.
 */
interface PhoneFieldProps {
  locale: Locale;
  /* The number input's id — what a label points at and an error focuses. */
  id: string;
  /* Class of a text field in the surrounding form; the code box wears it too. */
  className: string;
  numberName?: string;
  countryName?: string;
  required?: boolean;
  /* Controlled: the chosen country and the number as typed. */
  country?: string;
  number?: string;
  onChange?: (next: { country: string; number: string }) => void;
  /* Uncontrolled: a stored number, and the country to open on when it has none. */
  defaultValue?: string;
  defaultCountry?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

const CODE_LABEL: Record<Locale, string> = { he: 'קידומת מדינה', en: 'Country calling code' };

const PhoneField = ({
  locale,
  id,
  className,
  numberName = 'phone',
  countryName = 'phoneCountry',
  required,
  country: controlledCountry,
  number: controlledNumber,
  onChange,
  defaultValue = '',
  defaultCountry = 'IL',
  'aria-invalid': invalid,
  'aria-describedby': describedBy,
}: PhoneFieldProps) => {
  const [held, setHeld] = useState(() => {
    const split = splitPhone(defaultValue, defaultCountry);
    return { country: split.country, number: split.national };
  });
  const country = controlledCountry ?? held.country;
  const number = controlledNumber ?? held.number;
  const plan = dialPlanOf(country);

  const change = (next: { country: string; number: string }) => {
    setHeld(next);
    onChange?.(next);
  };

  const options = countriesFor(locale).filter((entry) => dialPlanOf(entry.code));
  /* The code box wears the field's look, but sizes to its content. */
  const boxClass = className
    .split(/\s+/)
    .filter((token) => token !== 'w-full')
    .join(' ');

  return (
    <div dir="ltr" className="flex gap-2">
      <span
        className={`${boxClass} relative flex shrink-0 items-center gap-1.5 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-current`}
      >
        <span aria-hidden="true" className="nt-flag text-lg leading-none">
          {countryFlag(country)}
        </span>
        <span aria-hidden="true" className="tabular-nums">
          +{plan?.dial ?? ''}
        </span>
        <svg aria-hidden="true" viewBox="0 0 20 20" className="size-3.5 opacity-60" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 8l5 5 5-5" />
        </svg>
        <select
          name={countryName}
          value={country}
          aria-label={CODE_LABEL[locale]}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => change({ country: event.target.value, number })}
          className="absolute inset-0 cursor-pointer opacity-0"
          dir={locale === 'he' ? 'rtl' : 'ltr'}
        >
          {options.map((entry) => (
            <option key={entry.code} value={entry.code}>
              {`${entry[locale]} (+${dialPlanOf(entry.code)?.dial ?? ''})`}
            </option>
          ))}
        </select>
      </span>
      <input
        id={id}
        name={numberName}
        type="tel"
        required={required}
        autoComplete="tel-national"
        inputMode="tel"
        dir="ltr"
        placeholder={country === 'IL' ? '050-1234567' : ''}
        value={number}
        onChange={(event) => change({ country, number: event.target.value })}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className={`${className} min-w-0 flex-1 text-start`}
      />
    </div>
  );
};

export default PhoneField;
