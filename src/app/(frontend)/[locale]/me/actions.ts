'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isSupportedLocale, type Locale } from '@/config/locales';
import { joinConference, leaveConference } from '@/features/account';
import {
  completeTotpSignIn,
  requestAccountLink,
  signInWithPassword,
} from '@/features/registration';

const readLocale = (formData: FormData): Locale => {
  const locale = String(formData.get('locale') ?? 'he');
  return isSupportedLocale(locale) ? locale : 'he';
};

/*
 * Password sign-in — the platform's front door. Failures never reveal
 * whether the email exists; a pre-password account is sent to the
 * mailed-link path to set one.
 */
export const signInAction = async (formData: FormData) => {
  const locale = readLocale(formData);
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
  const password = String(formData.get('password') ?? '');
  if (!email || !password) {
    redirect(`/${locale}/me?state=wrong`);
  }
  const result = await signInWithPassword(email, password);
  if (!result.ok) {
    if (result.reason === 'totp') {
      redirect(
        `/${locale}/me?state=totp&ticket=${encodeURIComponent(result.ticket)}`,
      );
    }
    redirect(`/${locale}/me?state=${result.reason}`);
  }
  redirect(`/${locale}/me`);
};

/*
 * The second step of the front door: the authenticator's six digits.
 */
export const totpSignInAction = async (formData: FormData) => {
  const locale = readLocale(formData);
  const ticket = String(formData.get('ticket') ?? '');
  const code = String(formData.get('code') ?? '');
  const outcome = await completeTotpSignIn(ticket, code);
  if (outcome === 'ok') {
    redirect(`/${locale}/me`);
  }
  if (outcome === 'wrong') {
    redirect(
      `/${locale}/me?state=totp&totpError=wrong&ticket=${encodeURIComponent(ticket)}`,
    );
  }
  if (outcome === 'locked') {
    redirect(`/${locale}/me?state=locked`);
  }
  redirect(`/${locale}/me?state=wrong`);
};

/*
 * Requests a platform sign-in link. The reply never reveals whether an
 * account exists; only a first-time visitor without a name is told a name
 * is needed.
 */
export const requestAccountLinkAction = async (formData: FormData) => {
  const locale = readLocale(formData);
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
  if (!email) {
    redirect(`/${locale}/me?view=reset&state=invalid`);
  }

  /*
   * Recovery only. `requestAccountLink` will open an account when handed
   * a name, and this action used to read one out of the form — which
   * meant that posting a `name` field alongside the address created a
   * full account here, quietly, with none of the questions the
   * conference asks. The form never showed that field, but a form is
   * not a gate: what reaches a server action is whatever was sent.
   *
   * Passing null makes this endpoint able to do one thing: mail a
   * sign-in link to an account that already exists.
   */
  const result = await requestAccountLink(email, null, locale);
  const development = process.env.NODE_ENV !== 'production';

  if (!result.ok) {
    /*
     * An address with no account gets the same answer as one with:
     * "if that email exists, a link is on its way". Saying "first time
     * here?" instead turned this box into a way to ask the platform
     * whether any given person has an account.
     */
    if (result.reason === 'needName') {
      redirect(`/${locale}/me?view=reset&state=sent`);
    }
    const detail =
      development && result.detail
        ? `&detail=${encodeURIComponent(result.detail)}`
        : '';
    redirect(`/${locale}/me?view=reset&state=${result.reason}${detail}`);
  }

  const devLink = development
    ? `&link=${encodeURIComponent(result.link)}`
    : '';
  /*
   * Every outcome of this form stays inside the recovery flow. It used
   * to answer on the sign-in screen, which meant the person who had
   * just asked for a link was looking at a password field again, with
   * the answer to their request as a note above it.
   */
  redirect(`/${locale}/me?view=reset&state=sent${devLink}`);
};

export const joinConferenceAction = async (formData: FormData) => {
  const locale = readLocale(formData);
  const slug = String(formData.get('slug') ?? '');
  if (!slug) {
    return;
  }

  const outcome = await joinConference(slug, locale);
  if (!outcome.ok && outcome.reason === 'conflict') {
    redirect(
      `/${locale}/me?state=conflict&with=${encodeURIComponent(outcome.conflictTitle)}`,
    );
  }
  if (!outcome.ok) {
    redirect(`/${locale}/me?state=joinFailed`);
  }

  revalidatePath(`/${locale}/me`);
};

export const leaveConferenceAction = async (formData: FormData) => {
  const locale = readLocale(formData);
  const slug = String(formData.get('slug') ?? '');
  if (!slug) {
    return;
  }
  await leaveConference(slug);
  revalidatePath(`/${locale}/me`);
};

/*
 * Sign-out lives with the account feature now (`signOutAction` in
 * `@/features/account`), because the site navigation and the profile
 * offer it too; the account screen imports it from there so every
 * "sign out" behaves the same way.
 */
