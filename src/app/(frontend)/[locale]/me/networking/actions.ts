'use server';

import { redirect } from 'next/navigation';
import { isSupportedLocale } from '@/config/locales';
import { connectToParticipant } from '@/features/networking';

/*
 * The community hub's connect action: everything begins with a
 * connection request (Connection Framework v1.0). The service finds the
 * first conference both sides share and files the request there.
 */
export const platformConnectAction = async (formData: FormData) => {
  const raw = String(formData.get('locale') ?? 'he');
  const locale = isSupportedLocale(raw) ? raw : 'he';
  const targetId = String(formData.get('participantId') ?? '');

  const outcome = await connectToParticipant(targetId);
  redirect(
    `/${locale}/me/networking?request=${outcome.ok ? 'sent' : outcome.reason}`,
  );
};
