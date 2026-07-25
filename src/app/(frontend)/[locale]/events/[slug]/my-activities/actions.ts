'use server';

import { redirect } from 'next/navigation';
import { FALLBACK_LOCALE, isSupportedLocale, type Locale } from '@/config/locales';
import { leaveWorkshop, selectWorkshop } from '@/features/program';

const localeOf = (value: string): Locale =>
  isSupportedLocale(value) ? value : FALLBACK_LOCALE;

const backTo = (locale: Locale, slug: string): string =>
  `/${locale}/events/${slug}/my-activities`;

/*
 * Joining an activity straight from the personal day — the same engine the
 * Program calls, so a seat taken here and a seat taken there are the same
 * seat. The service owns the outcome (a place, or the waiting list) and
 * every side effect; we only route back, naming a conflict or a full room
 * so the dashboard can say it softly.
 */
export const registerActivityAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  const locale = localeOf(String(formData.get('locale') ?? ''));
  const sessionId = String(formData.get('sessionId') ?? '');
  const base = backTo(locale, slug);
  let target = base;
  if (sessionId) {
    try {
      await selectWorkshop(sessionId, locale);
    } catch (thrown) {
      const reason =
        thrown instanceof Error && thrown.message === 'conflict'
          ? 'conflict'
          : 'full';
      target = `${base}?notice=${reason}`;
    }
  }
  redirect(target);
};

/*
 * Leaving an activity from the personal list. The cancellation, the
 * waitlist promotion it triggers and the notifications all live in the
 * program service; here we only route the guest back to their day.
 */
export const leaveActivityAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  const locale = localeOf(String(formData.get('locale') ?? ''));
  const sessionId = String(formData.get('sessionId') ?? '');
  if (sessionId) {
    await leaveWorkshop(sessionId, locale).catch(() => null);
  }
  redirect(backTo(locale, slug));
};
