'use server';

import { redirect } from 'next/navigation';
import { FALLBACK_LOCALE, isSupportedLocale } from '@/config/locales';
import { saveMyLocalePreference } from '@/features/registration';

/*
 * Changing the site language is a preference, not navigation: the choice
 * is stored on the account (and mirrored into the cookie the middleware
 * reads), and only then does the browser move to the same page in the
 * chosen language. A plain link could not do this — the middleware would
 * send it straight back to the stored preference.
 */
export const chooseLocaleAction = async (formData: FormData): Promise<void> => {
  const requested = String(formData.get('to') ?? '');
  const locale = isSupportedLocale(requested) ? requested : FALLBACK_LOCALE;

  await saveMyLocalePreference(locale);

  const raw = String(formData.get('next') ?? '');
  /* Only same-site paths: never follow a target supplied from outside. */
  const path = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
  const rest = path.replace(/^\/(he|en)(?=\/|$)/, '');
  redirect(`/${locale}${rest}`);
};
