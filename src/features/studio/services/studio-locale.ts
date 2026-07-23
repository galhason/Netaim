import { cookies } from 'next/headers';
import {
  FALLBACK_LOCALE,
  isSupportedLocale,
  type Locale,
} from '@/config/locales';

const STUDIO_LOCALE_COOKIE = 'studio-locale';

/*
 * The Studio UI language is independent of content language: it lives
 * in a cookie per creator, defaulting to the platform fallback.
 */
export const getStudioLocale = async (): Promise<Locale> => {
  const store = await cookies();
  const value = store.get(STUDIO_LOCALE_COOKIE)?.value;
  return value && isSupportedLocale(value) ? value : FALLBACK_LOCALE;
};

export const writeStudioLocale = async (locale: Locale): Promise<void> => {
  const store = await cookies();
  store.set(STUDIO_LOCALE_COOKIE, locale, { path: '/studio' });
};
