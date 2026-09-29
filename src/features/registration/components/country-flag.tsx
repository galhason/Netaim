import { countryByCode, countryFlag } from '@/shared/constants/countries';
import type { Locale } from '@/config/locales';

/*
 * A country's flag, drawn rather than spelled.
 *
 * `.nt-flag` puts the site's flag font in front of the body face (see
 * src/styles/flags.ts) — without it Windows shows the two letters of
 * the code. The flag is decoration: the country's name is beside it
 * wherever this is used, so the glyph is hidden from assistive
 * technology rather than read out twice.
 *
 * An unknown or empty code renders nothing at all, which is what an
 * account opened before this field existed has.
 */
interface CountryFlagProps {
  code: string | undefined | null;
  className?: string;
  /* When set, the name is rendered after the flag, in this language. */
  withName?: Locale;
}

const CountryFlag = ({ code, className, withName }: CountryFlagProps) => {
  const country = countryByCode(code);
  if (!country) {
    return null;
  }
  const flag = (
    <span aria-hidden="true" className={`nt-flag ${className ?? ''}`}>
      {countryFlag(country.code)}
    </span>
  );
  if (!withName) {
    return flag;
  }
  return (
    <span className="inline-flex items-center gap-2">
      {flag}
      <span>{country[withName]}</span>
    </span>
  );
};

export default CountryFlag;
