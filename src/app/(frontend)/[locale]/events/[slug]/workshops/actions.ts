'use server';

import { redirect } from 'next/navigation';
import { FALLBACK_LOCALE, isSupportedLocale, type Locale } from '@/config/locales';
import { leaveWorkshop, selectWorkshop } from '@/features/program';

const localeOf = (value: string): Locale =>
  isSupportedLocale(value) ? value : FALLBACK_LOCALE;

/*
 * The engine refuses with a sentence; the page is told with a word.
 * Anything it did not foresee reads as "full", as it always did.
 */
const reasonOf = (thrown: unknown): string => {
  const message = thrown instanceof Error ? thrown.message : '';
  if (message === 'conflict') return 'conflict';
  if (message === 'Registration not open yet') return 'notYet';
  if (message === 'Registration closed') return 'closed';
  return 'full';
};

export const selectWorkshopAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  const locale = localeOf(String(formData.get('locale') ?? ''));
  const sessionId = String(formData.get('sessionId') ?? '');
  const base = `/${locale}/events/${slug}/workshops`;

  let target = base;
  if (sessionId) {
    try {
      await selectWorkshop(sessionId, locale);
    } catch (thrown) {
      target = `${base}?error=${reasonOf(thrown)}`;
    }
  }
  redirect(target);
};

export const leaveWorkshopAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  const locale = localeOf(String(formData.get('locale') ?? ''));
  const sessionId = String(formData.get('sessionId') ?? '');
  if (sessionId) {
    await leaveWorkshop(sessionId, locale).catch(() => null);
  }
  redirect(`/${locale}/events/${slug}/workshops`);
};
