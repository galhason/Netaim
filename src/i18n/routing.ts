import { defineRouting } from 'next-intl/routing';
import { FALLBACK_LOCALE, SUPPORTED_LOCALES } from '@/config/locales';

export const routing = defineRouting({
  locales: SUPPORTED_LOCALES,
  defaultLocale: FALLBACK_LOCALE,
  localePrefix: 'always',
  /*
   * Hebrew is the default entry language for everyone. Without this the
   * Accept-Language header would send English browsers to /en.
   */
  localeDetection: false,
});
