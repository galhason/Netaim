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
  /*
   * next-intl mirrors the resolved language into a `NEXT_LOCALE` cookie
   * of its own, and it writes it to anonymous visitors — before anyone
   * has signed in or agreed to anything. Nothing here reads it: the
   * language a guest chooses lives in `participant_locale`, written at
   * sign-in, and every public URL already carries its locale in the
   * path. So it is switched off, and the site sets no cookie at all
   * until a person signs in. Fewer cookies is less to declare, and the
   * privacy policy's count stays true.
   */
  localeCookie: false,
});
