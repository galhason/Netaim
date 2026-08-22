import type { Locale } from './locales';

/*
 * The platform's brand mark as it appears in public chrome. A single
 * source so no surface spells it on its own.
 *
 * The mark is written in the reader's own script. A Hebrew reader sees
 * the name; an English reader sees a Latin transliteration rather than a
 * word they cannot read. This is one brand with two spellings, not two
 * brands.
 */
const BRAND_MARKS: Record<Locale, string> = {
  he: 'נטעים',
  en: 'Netaim',
};

export const brandFor = (locale: Locale): string => BRAND_MARKS[locale];

/*
 * `he` is the platform's routing fallback, so a surface with no reader
 * in hand resolves to the Hebrew mark. Prefer `brandFor(locale)`
 * wherever the reader is known.
 */
export const BRAND_NAME = BRAND_MARKS.he;

/*
 * Identifiers that leave the platform — an authenticator entry, a saved
 * contact card, a mail address — are read by systems and people outside
 * either locale, and by software that may not render Hebrew at all.
 * They carry the Latin mark always, never `brandFor`.
 */
export const BRAND_LATIN = BRAND_MARKS.en;

/*
 * The address a guest writes to when the platform itself is the problem.
 * Named here rather than spelled into a page, because it changes with
 * the deployment and not with the design.
 *
 * Deliberately still the address that exists and receives mail. A brand
 * rename does not move a mailbox, and pointing this at a domain nobody
 * has configured would send a stuck guest's message nowhere. Set
 * `NEXT_PUBLIC_SUPPORT_EMAIL` when the new mailbox is live.
 */
export const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'support@hason.events';
