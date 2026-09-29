import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  LATIN_NAME_ERROR,
  LATIN_NAME_HINT,
  isLatinName,
} from '@/features/registration/schemas/latin-name';
import {
  COUNTRIES,
  countriesFor,
  countryByCode,
  countryFlag,
  countryName,
  isCountryCode,
} from '@/shared/constants/countries';

/*
 * Two rules the registration form learned at once.
 *
 * The badge is printed in the Latin alphabet and the guest's country
 * is stored as a code. Both are enforced twice — in the form, so that
 * "continue" refuses rather than the submit, and in the server action,
 * which is the only one of the two that is binding. These cases hold
 * the rule itself and then check that both sides really ask it.
 */
const read = (path: string): string => readFileSync(path, 'utf8');

const FORM = 'src/app/(frontend)/[locale]/events/[slug]/register/register-form.tsx';
const ACTION = 'src/app/(frontend)/[locale]/events/[slug]/register/actions.ts';

describe('a name the badge can print', () => {
  it('takes a Latin name, however it is spelled', () => {
    for (const name of [
      'Gal',
      'Gal Hason',
      'Müller',
      'Ríos',
      "O'Brien",
      'Jean-Luc',
      'Škoda',
      'St. John',
    ]) {
      expect(isLatinName(name), name).toBe(true);
    }
  });

  it('refuses another alphabet, and a field with no letter in it', () => {
    for (const name of ['גל', 'חסון', 'Gal חסון', 'Иван', '李', '', '   ', '-', '42']) {
      expect(isLatinName(name), JSON.stringify(name)).toBe(false);
    }
  });

  it('says so in both languages, before anybody types', () => {
    expect(LATIN_NAME_HINT.he).toContain('באנגלית בלבד');
    expect(LATIN_NAME_HINT.en).toContain('English');
    expect(LATIN_NAME_ERROR.he.length).toBeGreaterThan(0);
    expect(LATIN_NAME_ERROR.en.length).toBeGreaterThan(0);
  });

  /*
   * The form's own check is what stops the step; the action's is what
   * makes it a rule. A form that checked alone could be walked past
   * with the script off, and an action that checked alone would only
   * say so after a person had chosen a password.
   */
  it('is asked by the form before the step turns, and by the action before a code is sent', () => {
    const form = read(FORM);
    expect(form).toContain('isLatinName(values.firstName)');
    expect(form).toContain('isLatinName(values.lastName)');

    const action = read(ACTION);
    expect(action).toContain('isLatinName(kept.firstName)');
    expect(action).toContain('isLatinName(kept.lastName)');
    /*
     * Refused before the store is asked anything about the address —
     * the call, not the import above it, which is why the needle is
     * the whole expression.
     */
    expect(action.indexOf('isLatinName(kept.firstName)')).toBeLessThan(
      action.indexOf('await emailHasAccount(details.email)'),
    );
  });
});

describe('the country a guest comes from', () => {
  it('holds every currently assigned country, once each', () => {
    expect(COUNTRIES).toHaveLength(249);
    expect(new Set(COUNTRIES.map((c) => c.code)).size).toBe(249);
  });

  it('names each of them in both languages', () => {
    const unnamed = COUNTRIES.filter(
      (c) => c.en.trim().length === 0 || c.he.trim().length === 0,
    );
    expect(unnamed).toEqual([]);
  });

  it('knows a code from the list and nothing else', () => {
    expect(isCountryCode('IL')).toBe(true);
    expect(isCountryCode('il')).toBe(true);
    expect(isCountryCode(' cz ')).toBe(true);
    for (const junk of ['ZZ', 'XX', 'ISR', '', 'Israel', undefined, null]) {
      expect(isCountryCode(junk), String(junk)).toBe(false);
    }
  });

  it('answers in the language it was asked in', () => {
    expect(countryName('IL', 'he')).toBe('ישראל');
    expect(countryName('IL', 'en')).toBe('Israel');
    expect(countryByCode('cz')?.code).toBe('CZ');
  });

  /*
   * The flag is derived from the code rather than written down beside
   * it, so the two can never disagree: 'IL' is U+1F1EE U+1F1F1.
   */
  it('draws the flag out of the code itself', () => {
    expect([...countryFlag('IL')].map((ch) => ch.codePointAt(0))).toEqual([
      0x1f1ee, 0x1f1f1,
    ]);
    expect(countryFlag('ZZ')).toBe('');
    expect(countryFlag(undefined)).toBe('');
  });

  it('orders the list by the alphabet the reader is using', () => {
    for (const locale of ['he', 'en'] as const) {
      const list = countriesFor(locale);
      expect(list).toHaveLength(249);
      const collator = new Intl.Collator(locale);
      const sorted = [...list].sort((a, b) =>
        collator.compare(a[locale], b[locale]),
      );
      expect(list.map((c) => c.code)).toEqual(sorted.map((c) => c.code));
    }
  });

  it('is refused by the action unless it is a code from the list', () => {
    const action = read(ACTION);
    expect(action).toContain('isCountryCode(kept.country)');
    expect(read(FORM)).toContain("errors.country = f.required");
  });

  /*
   * Windows draws no flag glyph, so the site carries a flag font and
   * every flag is set in it. Without the `.nt-flag` stack a guest on
   * Windows sees the two letters of the code where a flag should be.
   */
  it('is drawn in the font the site carries, not the one the machine has', () => {
    expect(read('src/styles/globals.css')).toContain(
      'font-family: var(--font-flags), var(--font-body)',
    );
    expect(read('src/app/(frontend)/[locale]/layout.tsx')).toContain(
      '${flagFont.variable}',
    );
  });
});
