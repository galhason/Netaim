'use server';

import { redirect } from 'next/navigation';
import { FALLBACK_LOCALE, isSupportedLocale, type Locale } from '@/config/locales';
import { leaveWorkshop } from '@/features/program';

const localeOf = (value: string): Locale =>
  isSupportedLocale(value) ? value : FALLBACK_LOCALE;

/*
 * Leaving an activity from the personal list. The cancellation, the
 * waitlist promotion it triggers and the notifications all live in the
 * program service; here we only route the guest back to their list.
 */
export const leaveActivityAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  const locale = localeOf(String(formData.get('locale') ?? ''));
  const sessionId = String(formData.get('sessionId') ?? '');
  if (sessionId) {
    await leaveWorkshop(sessionId, locale).catch(() => null);
  }
  redirect(`/${locale}/events/${slug}/my-activities`);
};
