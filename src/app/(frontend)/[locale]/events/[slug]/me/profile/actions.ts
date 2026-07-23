'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { FALLBACK_LOCALE, isSupportedLocale, type Locale } from '@/config/locales';
import { updateMyDetails } from '@/features/registration';

/*
 * The guest edits only themselves: the participant id comes from the
 * signed session, never from the form.
 */
const text = (value: FormDataEntryValue | null): string | undefined => {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed.length > 0 ? trimmed : undefined;
};

export const saveMyProfileAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  const rawLocale = String(formData.get('locale') ?? '');
  const locale: Locale = isSupportedLocale(rawLocale)
    ? rawLocale
    : FALLBACK_LOCALE;
  const saved = await updateMyDetails({
    name: text(formData.get('name')),
    phone: text(formData.get('phone')),
    dietary: text(formData.get('dietary')),
    accessibility: text(formData.get('accessibility')),
    organization: text(formData.get('organization')),
    role: text(formData.get('role')),
  }).catch(() => false);
  const base = `/${locale}/events/${slug}/me/profile`;
  revalidatePath(`/${locale}/events/${slug}/me`, 'layout');
  redirect(saved ? `${base}?saved=1` : base);
};
