'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isSupportedLocale, type Locale } from '@/config/locales';
import { joinConference, leaveConference } from '@/features/account';
import {
  clearSession,
  completeTotpSignIn,
  openAccountWithPassword,
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

export const openAccountAction = async (formData: FormData) => {
  const locale = readLocale(formData);
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
  const name = String(formData.get('name') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!email || !name || !password) {
    redirect(`/${locale}/me?state=missing&view=open`);
  }
  const result = await openAccountWithPassword(email, name, password);
  if (!result.ok) {
    redirect(`/${locale}/me?state=${result.reason}&view=open`);
  }
  redirect(`/${locale}/me`);
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
  const name = String(formData.get('name') ?? '').trim();
  if (!email) {
    redirect(`/${locale}/me?state=invalid`);
  }

  const result = await requestAccountLink(email, name || null, locale);
  const development = process.env.NODE_ENV !== 'production';

  if (!result.ok) {
    const detail =
      development && result.detail
        ? `&detail=${encodeURIComponent(result.detail)}`
        : '';
    redirect(`/${locale}/me?state=${result.reason}${detail}`);
  }

  const devLink = development
    ? `&link=${encodeURIComponent(result.link)}`
    : '';
  redirect(`/${locale}/me?state=sent${devLink}`);
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

export const signOutAction = async (formData: FormData) => {
  const locale = readLocale(formData);
  await clearSession();
  redirect(`/${locale}`);
};
