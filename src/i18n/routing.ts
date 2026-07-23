import { defineRouting } from 'next-intl/routing';
import { FALLBACK_LOCALE, SUPPORTED_LOCALES } from '@/config/locales';

export const routing = defineRouting({
  locales: SUPPORTED_LOCALES,
  defaultLocale: FALLBACK_LOCALE,
  localePrefix: 'always',
});
