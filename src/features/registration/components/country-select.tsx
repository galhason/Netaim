'use client';

import { useState, type ChangeEvent } from 'react';
import type { Locale } from '@/config/locales';
import { countriesFor, countryFlag } from '@/shared/constants/countries';

/*
 * Where a guest comes from, asked once and answered from a list.
 *
 * A list rather than a text box for the same reason the food question
 * became one: "ישראל", "Israel" and "IL" are one country and three
 * rows in every count a producer takes. What is stored is the ISO
 * 3166-1 code, so the answer survives the language it was given in.
 *
 * The flag cannot live inside the `<option>`s: a native select draws
 * its own list, and on Windows no flag glyph reaches it. So the list
 * is plain names — which is also what a screen reader wants — and the
 * flag of the chosen country sits beside the field, in ordinary page
 * DOM where the site's flag font applies. `inset-inline-start` puts it
 * on the reading side in both directions without a second rule.
 *
 * Uncontrolled by default and seeded from `defaultValue`, so the two
 * profile screens (server-rendered forms) can use it as they use every
 * other field. `onChange` is for the registration form, which lifts
 * every value into its own state so the step that is not on screen can
 * carry it in a hidden input.
 */
interface CountrySelectProps {
  locale: Locale;
  defaultValue?: string;
  className: string;
  name?: string;
  id?: string;
  required?: boolean;
  placeholder?: string;
  onChange?: (code: string) => void;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

const CountrySelect = ({
  locale,
  defaultValue,
  className,
  name = 'country',
  id,
  required,
  placeholder,
  onChange,
  'aria-invalid': invalid,
  'aria-describedby': describedBy,
}: CountrySelectProps) => {
  const [code, setCode] = useState(defaultValue ?? '');
  const flag = countryFlag(code);

  const handle = (event: ChangeEvent<HTMLSelectElement>) => {
    setCode(event.target.value);
    onChange?.(event.target.value);
  };

  return (
    <span className="relative block">
      <select
        id={id}
        name={name}
        required={required}
        value={code}
        onChange={handle}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className={`${className}${flag ? ' ps-11' : ''}`}
      >
        <option value="" disabled={required}>
          {placeholder ?? (locale === 'he' ? 'בחרו מדינה' : 'Choose a country')}
        </option>
        {countriesFor(locale).map((country) => (
          <option key={country.code} value={country.code}>
            {country[locale]}
          </option>
        ))}
      </select>
      {flag ? (
        <span
          aria-hidden="true"
          className="nt-flag pointer-events-none absolute inset-y-0 start-4 flex items-center text-lg"
        >
          {flag}
        </span>
      ) : null}
    </span>
  );
};

export default CountrySelect;
