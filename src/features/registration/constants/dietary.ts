import type { Locale } from '@/config/locales';

/*
 * What people eat, as one list the whole platform agrees on.
 *
 * The registration form has always offered a fixed set of preferences
 * (PRD §3.1 — a choice, never free text), but it posted the *label the
 * guest saw*: a Hebrew registrant stored "צמחוני" and an English one
 * stored "Vegetarian". Two spellings of one preference, and a caterer's
 * count that quietly splits in half.
 *
 * The fix is a key. The form still offers the labels — a guest chooses
 * words, not identifiers — and the stored value stays exactly as it was
 * written, so nothing already in the database has to be rewritten. What
 * changed is the reading: `dietaryKeyOf` recognises either language's
 * spelling (and the key itself, for anything written later) and returns
 * the one preference behind it. Counting happens on keys; only the
 * display turns back into words.
 */
export const DIETARY_KEYS = [
  'regular',
  'vegetarian',
  'vegan',
  'glutenFree',
  'kosherMehadrin',
] as const;

export type DietaryKey = (typeof DIETARY_KEYS)[number];

export const DIETARY_LABELS: Record<DietaryKey, Record<Locale, string>> = {
  regular: { he: 'רגיל', en: 'Regular' },
  vegetarian: { he: 'צמחוני', en: 'Vegetarian' },
  vegan: { he: 'טבעוני', en: 'Vegan' },
  glutenFree: { he: 'ללא גלוטן', en: 'Gluten-free' },
  kosherMehadrin: { he: 'כשרות מהודרת', en: 'Kosher mehadrin' },
};

/* The choices a guest sees, in their language, in a fixed order. */
export const dietaryOptionsFor = (locale: Locale): string[] =>
  DIETARY_KEYS.map((key) => DIETARY_LABELS[key][locale]);

export const dietaryLabel = (key: DietaryKey, locale: Locale): string =>
  DIETARY_LABELS[key][locale];

/*
 * Two spellings of the same word must not be two preferences: case,
 * spaces, hyphens, quotation marks and Hebrew vowel points all fall
 * away before anything is compared.
 */
const flatten = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[֑-ׇ]/g, '')
    .replace(/[^a-zא-ת0-9]/g, '');

const INDEX: Map<string, DietaryKey> = (() => {
  const index = new Map<string, DietaryKey>();
  const add = (spelling: string, key: DietaryKey) => {
    const flat = flatten(spelling);
    if (flat) {
      index.set(flat, key);
    }
  };
  for (const key of DIETARY_KEYS) {
    add(key, key);
    add(DIETARY_LABELS[key].he, key);
    add(DIETARY_LABELS[key].en, key);
  }
  /* Spellings the form itself never wrote, but a person might. */
  add('gluten free', 'glutenFree');
  add('כשר מהדרין', 'kosherMehadrin');
  add('מהדרין', 'kosherMehadrin');
  add('כשר', 'kosherMehadrin');
  return index;
})();

/*
 * The preference behind a stored value, or null when there is nothing
 * to go on — an empty field, or wording from before this list existed.
 * Null is a real answer here: the logistics count says how many people
 * have not chosen rather than inventing a preference for them.
 */
export const dietaryKeyOf = (
  stored: string | null | undefined,
): DietaryKey | null => {
  if (!stored) {
    return null;
  }
  return INDEX.get(flatten(stored)) ?? null;
};
