'use server';

import { revalidatePath } from 'next/cache';
import { isSupportedLocale } from '@/config/locales';
import { sendChatMessage } from '@/features/networking';

/*
 * Sending a word into the thread. The service proves membership and a
 * living connection; here we only carry the text.
 */
export const sendChatAction = async (formData: FormData) => {
  const raw = String(formData.get('locale') ?? 'he');
  const locale = isSupportedLocale(raw) ? raw : 'he';
  const connectionId = String(formData.get('connectionId') ?? '');
  const body = String(formData.get('body') ?? '');
  if (!connectionId) {
    return;
  }
  await sendChatMessage(connectionId, body);
  revalidatePath(`/${locale}/me/chat/${connectionId}`);
};
