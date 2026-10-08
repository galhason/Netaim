'use server';

import { redirect } from 'next/navigation';
import { FALLBACK_LOCALE, isSupportedLocale, type Locale } from '@/config/locales';
import { leaveWorkshop, selectWorkshop } from '@/features/program';

const localeOf = (value: string): Locale =>
  isSupportedLocale(value) ? value : FALLBACK_LOCALE;

const backTo = (locale: Locale, slug: string): string =>
  `/${locale}/events/${slug}/my-activities`;

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
      target = `${base}?notice=${reasonOf(thrown)}`;
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
  let target = backTo(locale, slug);
  if (sessionId) {
    try {
      await leaveWorkshop(sessionId, locale);
    } catch (thrown) {
      if (thrown instanceof Error && thrown.message === 'Cancellation not allowed') {
        target = `${target}?notice=noCancel`;
      }
    }
  }
  redirect(target);
};
