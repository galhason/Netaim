const MAX_SLUG_LENGTH = 60;

/*
 * A conference address must be plain ASCII: server redirects, Location
 * headers and route params all break on raw Unicode. A Hebrew title is
 * romanized letter by letter so the address still carries the name —
 * "כנס חדשנות" becomes "kns-chdshnvt", never a broken header.
 */
const HEBREW_LATIN: Record<string, string> = {
  א: 'a',
  ב: 'b',
  ג: 'g',
  ד: 'd',
  ה: 'h',
  ו: 'v',
  ז: 'z',
  ח: 'ch',
  ט: 't',
  י: 'y',
  כ: 'k',
  ך: 'k',
  ל: 'l',
  מ: 'm',
  ם: 'm',
  נ: 'n',
  ן: 'n',
  ס: 's',
  ע: 'a',
  פ: 'p',
  ף: 'p',
  צ: 'ts',
  ץ: 'ts',
  ק: 'k',
  ר: 'r',
  ש: 'sh',
  ת: 't',
};

export const toEventSlug = (title: string): string => {
  const romanized = [...title.trim().toLowerCase()]
    .map((char) => HEBREW_LATIN[char] ?? char)
    .join('');
  const base = romanized
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['"’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, '');
  return base || `event-${Date.now()}`;
};

export const duplicateSlug = (slug: string): string =>
  `${slug}-copy-${Date.now().toString(36)}`;
