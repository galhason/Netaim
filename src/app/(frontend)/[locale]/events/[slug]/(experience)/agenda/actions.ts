'use server';

import { redirect } from 'next/navigation';
import { FALLBACK_LOCALE, isSupportedLocale, type Locale } from '@/config/locales';
import { leaveWorkshop, selectWorkshop } from '@/features/program';

const localeOf = (value: string): Locale =>
  isSupportedLocale(value) ? value : FALLBACK_LOCALE;

/*
 * Registering from the agenda. The registration engine owns the outcome
 * (a place, or the waiting list) and every side effect; here we only
 * route the participant back, surfacing a conflict or a full activity as
 * a soft banner.
 *
 * The route is `/agenda` and not `/program`, and that is the whole of a
 * bug that made this action impossible to run. The edge gives every URL
 * ending in `/program` to WordPress -- for POST as well as GET -- so the
 * form on this page posted to its own address and WordPress answered,
 * with its English programme page. Next never saw the action, nothing
 * was ever registered, and a Hebrew reader ended up reading English.
 * The public programme is WordPress's and keeps that address; this is
 * the participant's own agenda and now has one of its own.
 */
export const registerActivityAction = async (formData: FormData) => {
  const locale = localeOf(String(formData.get('locale') ?? ''));
  const slug = String(formData.get('slug') ?? '');
  const sessionId = String(formData.get('sessionId') ?? '');
  /* The button has always submitted the conference; now the way back uses it. */
  const base = `/${locale}/events/${slug}/agenda`;
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

export const leaveActivityAction = async (formData: FormData) => {
  const locale = localeOf(String(formData.get('locale') ?? ''));
  const sessionId = String(formData.get('sessionId') ?? '');
  const slug = String(formData.get('slug') ?? '');
  if (sessionId) {
    await leaveWorkshop(sessionId, locale).catch(() => null);
  }
  redirect(`/${locale}/events/${slug}/agenda`);
};
