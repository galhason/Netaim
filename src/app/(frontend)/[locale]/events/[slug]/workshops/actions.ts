'use server';

import { redirect } from 'next/navigation';
import { FALLBACK_LOCALE, isSupportedLocale, type Locale } from '@/config/locales';
import { leaveWorkshop, selectWorkshop } from '@/features/program';

const localeOf = (value: string): Locale =>
  isSupportedLocale(value) ? value : FALLBACK_LOCALE;

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
      const reason =
        thrown instanceof Error && thrown.message === 'conflict'
          ? 'conflict'
          : 'full';
      target = `${base}?error=${reason}`;
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
