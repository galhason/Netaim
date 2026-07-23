'use server';

import { redirect } from 'next/navigation';
import { isSupportedLocale } from '@/config/locales';
import {
  beginTotpEnrollment,
  confirmTotpEnrollment,
  disableTotp,
  saveMyContactPreferences,
  setMyPassword,
  updateMyDetails,
  updateMyPhoto,
} from '@/features/registration';

const optional = (value: FormDataEntryValue | null): string | undefined => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text.length > 0 ? text : undefined;
};

/*
 * The profile is the account's, not a conference's: saving it here
 * updates the guest everywhere they are registered.
 */
export const saveAccountProfileAction = async (formData: FormData) => {
  const raw = String(formData.get('locale') ?? 'he');
  const locale = isSupportedLocale(raw) ? raw : 'he';

  await updateMyDetails({
    name: optional(formData.get('name')),
    phone: optional(formData.get('phone')),
    organization: optional(formData.get('organization')),
    role: optional(formData.get('role')),
    dietary: optional(formData.get('dietary')),
    accessibility: optional(formData.get('accessibility')),
    interests: optional(formData.get('interests')),
  });

  redirect(`/${locale}/me/profile?saved=1`);
};

/*
 * Contact governance (Connection Framework v1.0): the participant
 * decides which channels open to approved connections. Changes apply
 * immediately — the connection service re-reads on every request.
 */
export const saveContactPrefsAction = async (formData: FormData) => {
  const raw = String(formData.get('locale') ?? 'he');
  const locale = isSupportedLocale(raw) ? raw : 'he';

  await saveMyContactPreferences({
    whatsapp: formData.get('whatsapp') === 'on',
    phone: formData.get('phonePref') === 'on',
    email: formData.get('emailPref') === 'on',
    meetings: formData.get('meetings') === 'on',
  });

  redirect(`/${locale}/me/profile?saved=1`);
};

/*
 * The card's portrait: the uploaded image becomes the account's face
 * everywhere. Type and size are enforced in the service.
 */
export const savePhotoAction = async (formData: FormData) => {
  const raw = String(formData.get('locale') ?? 'he');
  const locale = isSupportedLocale(raw) ? raw : 'he';
  const file = formData.get('photo');

  if (!(file instanceof File) || file.size === 0) {
    redirect(`/${locale}/me/profile?view=edit&photo=failed`);
  } else {
    const accepted = await updateMyPhoto({
      name: file.name,
      type: file.type,
      data: new Uint8Array(await file.arrayBuffer()),
    });
    redirect(
      accepted
        ? `/${locale}/me/profile?saved=1`
        : `/${locale}/me/profile?view=edit&photo=failed`,
    );
  }
};

/*
 * 2FA (TOTP): begin shows the QR, confirm arms it with a real code,
 * disable requires a code too — the second factor guards itself.
 */
export const startTotpAction = async (formData: FormData) => {
  const raw = String(formData.get('locale') ?? 'he');
  const locale = isSupportedLocale(raw) ? raw : 'he';
  await beginTotpEnrollment();
  redirect(`/${locale}/me/profile?view=edit#totp`);
};

export const confirmTotpAction = async (formData: FormData) => {
  const raw = String(formData.get('locale') ?? 'he');
  const locale = isSupportedLocale(raw) ? raw : 'he';
  const accepted = await confirmTotpEnrollment(
    String(formData.get('code') ?? ''),
  );
  redirect(
    accepted
      ? `/${locale}/me/profile?view=edit&totp=enabled#totp`
      : `/${locale}/me/profile?view=edit&totp=wrong#totp`,
  );
};

export const disableTotpAction = async (formData: FormData) => {
  const raw = String(formData.get('locale') ?? 'he');
  const locale = isSupportedLocale(raw) ? raw : 'he';
  const accepted = await disableTotp(String(formData.get('code') ?? ''));
  redirect(
    accepted
      ? `/${locale}/me/profile?view=edit&totp=disabled#totp`
      : `/${locale}/me/profile?view=edit&totp=wrong#totp`,
  );
};

/*
 * Changing the account password — policy enforced in the identity
 * service; a signed-out visitor is sent back to the door.
 */
export const changePasswordAction = async (formData: FormData) => {
  const raw = String(formData.get('locale') ?? 'he');
  const locale = isSupportedLocale(raw) ? raw : 'he';
  const password = String(formData.get('password') ?? '');

  const outcome = await setMyPassword(password);
  if (outcome === 'signedOut') {
    redirect(`/${locale}/me`);
  }
  redirect(
    `/${locale}/me/profile?view=edit&password=${outcome === 'ok' ? 'changed' : 'weak'}`,
  );
};
