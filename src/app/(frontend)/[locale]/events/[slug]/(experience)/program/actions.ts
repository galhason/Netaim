'use server';

import { redirect } from 'next/navigation';
import { FALLBACK_LOCALE, isSupportedLocale, type Locale } from '@/config/locales';
import { leaveWorkshop, selectWorkshop } from '@/features/program';

const localeOf = (value: string): Locale =>
  isSupportedLocale(value) ? value : FALLBACK_LOCALE;

/*
 * Registering from the Program page. The registration engine owns the
 * outcome (a place, or the waiting list) and every side effect; here we
 * only route the participant back to the program, surfacing a conflict or
 * a full activity as a soft banner.
 */
export const registerActivityAction = async (formData: FormData) => {
  const locale = localeOf(String(formData.get('locale') ?? ''));
  const slug = String(formData.get('slug') ?? '');
  const sessionId = String(formData.get('sessionId') ?? '');
  /* The button has always submitted the conference; now the way back uses it. */
  const base = `/${locale}/events/${slug}/program`;
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
  redirect(`/${locale}/events/${slug}/program`);
};
