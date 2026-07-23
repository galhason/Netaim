export const SUPPORTED_LOCALES = ['he', 'en'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

/*
 * Technical routing fallback only. The effective default locale of an
 * event is defined per-event in the CMS (Product Owner decision, Sprint 0).
 */
export const FALLBACK_LOCALE: Locale = 'he';

export const LOCALE_LABELS: Record<Locale, string> = {
  he: 'עברית',
  en: 'EN',
};

export type TextDirection = 'rtl' | 'ltr';

const LOCALE_DIRECTIONS: Record<Locale, TextDirection> = {
  he: 'rtl',
  en: 'ltr',
};

export const getTextDirection = (locale: Locale): TextDirection =>
  LOCALE_DIRECTIONS[locale];

export const isSupportedLocale = (value: string): value is Locale =>
  (SUPPORTED_LOCALES as readonly string[]).includes(value);
