'use server';

import { redirect } from 'next/navigation';
import { FALLBACK_LOCALE, isSupportedLocale } from '@/config/locales';
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
const localeOf = (formData: FormData): string => {
  const requested = String(formData.get('locale') ?? '');
  return isSupportedLocale(requested) ? requested : FALLBACK_LOCALE;
};

export const signOutAction = async (formData: FormData): Promise<void> => {
  const locale = localeOf(formData);
  await clearSession();
  redirect(`/${locale}`);
};

export const signOutEverywhereAction = async (formData: FormData): Promise<void> => {
  const locale = localeOf(formData);
  const me = await currentParticipant().catch(() => null);
  if (me) {
    await clearAllSessions(me.id);
  }
  await clearSession();
  redirect(`/${locale}`);
};
