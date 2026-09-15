import type { Locale } from '@/config/locales';
import {
  DIETARY_KEYS,
  DIETARY_LABELS,
  dietaryKeyOf,
} from '../constants/dietary';

/*
 * The food question, asked the same way everywhere.
 *
 * The registration form has always offered a fixed list; the profile
 * screens used to offer an empty text box, so the same person could
 * arrive as "צמחוני" and later become "צמחונית" — one guest, two
 * preferences, and a catering count that is wrong in both directions.
 * This is that same list, for the places a guest revises the answer.
 *
 * A value the list does not recognise — something typed before the box
 * became a list — is kept as its own option rather than silently
 * dropped: losing a person's answer is worse than an untidy list, and
 * the guest can still choose one of the five.
 */
interface DietarySelectProps {
  locale: Locale;
  value: string | undefined;
  className: string;
  name?: string;
}

const DietarySelect = ({
  locale,
  value,
  className,
  name = 'dietary',
}: DietarySelectProps) => {
  const known = dietaryKeyOf(value);
  const current = known ? DIETARY_LABELS[known][locale] : (value ?? '').trim();
  return (
    <select name={name} defaultValue={current} className={className}>
      <option value="">{locale === 'he' ? 'ללא העדפה' : 'No preference'}</option>
      {DIETARY_KEYS.map((key) => (
        <option key={key} value={DIETARY_LABELS[key][locale]}>
          {DIETARY_LABELS[key][locale]}
        </option>
      ))}
      {!known && current ? <option value={current}>{current}</option> : null}
    </select>
  );
};

export default DietarySelect;
