'use server';

import { redirect } from 'next/navigation';
import { isSupportedLocale } from '@/config/locales';
import { connectByToken } from '@/features/networking';

/*
 * QR Connect: the scan becomes a connection request. The optional
 * meeting context ("we met at…") travels inside the request message so
 * the approval screen tells the story of the moment.
 */
const MAX_MESSAGE = 300;

export const qrConnectAction = async (formData: FormData) => {
  const rawLocale = String(formData.get('locale') ?? 'he');
  const locale = isSupportedLocale(rawLocale) ? rawLocale : 'he';
  const token = String(formData.get('token') ?? '');
  const context = String(formData.get('context') ?? '').trim();
  const note = String(formData.get('message') ?? '')
    .trim()
    .slice(0, MAX_MESSAGE);

  const parts = [
    ...(context ? [context] : []),
    ...(note ? [note] : []),
  ];
  const message = parts.join(' · ') || undefined;

  const outcome = await connectByToken(token, message);
  if (!outcome.ok) {
    redirect(
      `/${locale}/connect/${encodeURIComponent(token)}?result=${outcome.reason}`,
    );
  }
  redirect(`/${locale}/connect/${encodeURIComponent(token)}?result=sent`);
};
