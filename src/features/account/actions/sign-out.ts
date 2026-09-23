'use server';

import { redirect } from 'next/navigation';
import { FALLBACK_LOCALE, isSupportedLocale, type Locale } from '@/config/locales';
import { wordpressHref } from '@/config/wordpress';
import {
  clearAllSessions,
  clearSession,
  currentParticipant,
} from '@/features/registration';

/*
 * Leaving. One action for every door out — the site navigation, the
 * profile, the account screen — so that "sign out" means the same
 * thing wherever it is pressed: this browser's session is ended and
 * the person is returned to the front of the site in their language.
 *
 * Only this session, by default. A person signing out on a shared
 * computer expects their phone to stay signed in. The profile offers
 * the other case explicitly — `everywhere` — for a lost phone or a
 * password that may have leaked, and that one revokes every session
 * the account holds before ending this one.
 */
const localeOf = (formData: FormData): Locale => {
  const requested = String(formData.get('locale') ?? '');
  return isSupportedLocale(requested) ? requested : FALLBACK_LOCALE;
};

/*
 * "The front of the site" is WordPress, and its English front has no
 * locale prefix. Building `/${locale}` sent an English visitor to /en,
 * which nothing serves — so leaving the platform ended at a 404, on the
 * one path taken by everyone who signs out.
 */

export const signOutAction = async (formData: FormData): Promise<void> => {
  const locale = localeOf(formData);
  await clearSession();
  redirect(wordpressHref('home', locale));
};

export const signOutEverywhereAction = async (formData: FormData): Promise<void> => {
  const locale = localeOf(formData);
  const me = await currentParticipant().catch(() => null);
  if (me) {
    await clearAllSessions(me.id);
  }
  await clearSession();
  redirect(wordpressHref('home', locale));
};
