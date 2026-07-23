'use server';

import { redirect } from 'next/navigation';
import { FALLBACK_LOCALE, isSupportedLocale, type Locale } from '@/config/locales';
import {
  establishSession,
  isStrongPassword,
  parseRegisterForm,
  registerForEvent,
  setMyPassword,
  signInWithPassword,
} from '@/features/registration';
import { scheduleConflictFor } from '@/features/account';
import { saveMyProfile } from '@/features/networking';

const localeOf = (value: string): Locale =>
  isSupportedLocale(value) ? value : FALLBACK_LOCALE;

export const registerAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  const locale = localeOf(String(formData.get('locale') ?? ''));
  const base = `/${locale}/events/${slug}/register`;

  let target = base;
  if (!slug) {
    redirect(base);
  }

  /*
   * The schedule rule holds on every door (Identity Build Brief WP5):
   * a signed-in guest may not hold two overlapping conferences.
   */
  const conflictWith = await scheduleConflictFor(slug, locale).catch(() => null);
  if (conflictWith) {
    redirect(`${base}?error=conflict&with=${encodeURIComponent(conflictWith)}`);
  }

  /*
   * Password is chosen at registration (email + password sign-in, no
   * mailed verification). Validate before creating anything so a weak
   * password never leaves a passwordless account behind.
   */
  const password = String(formData.get('password') ?? '');
  if (!isStrongPassword(password)) {
    redirect(`${base}?error=weakPassword`);
  }

  const parsed = parseRegisterForm(formData);
  if (!parsed.success) {
    redirect(`${base}?error=invalid`);
  } else {
    try {
      const { networkingOptIn, ...details } = parsed.data;
      const result = await registerForEvent(slug, locale, details);
      await establishSession(result.participantId);
      /* The account is signed in — set its password for future sign-ins. */
      await setMyPassword(password);
      if (networkingOptIn) {
        await saveMyProfile(slug, {
          headline: details.role,
          bio: undefined,
          interests: undefined,
          links: [],
          visible: true,
          availableForMeetings: true,
        }).catch(() => null);
      }
      target = `${base}?outcome=${result.outcome}`;
    } catch {
      target = `${base}?error=closed`;
    }
  }

  redirect(target);
};

/*
 * Returning guests sign in with email + password (2FA stays optional and
 * is only asked when the account itself enabled it).
 */
export const passwordSignInAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  const locale = localeOf(String(formData.get('locale') ?? ''));
  const base = `/${locale}/events/${slug}/register`;
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    redirect(`${base}?signinError=missing`);
  }

  const result = await signInWithPassword(email, password);
  if (!result.ok) {
    if (result.reason === 'totp') {
      redirect(
        `/${locale}/me?state=totp&ticket=${encodeURIComponent(result.ticket)}`,
      );
    }
    redirect(`${base}?signinError=${result.reason}`);
  }

  redirect(`/${locale}/me`);
};
