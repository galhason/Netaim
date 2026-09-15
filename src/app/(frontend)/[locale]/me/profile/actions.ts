'use server';

import { redirect } from 'next/navigation';
import { isSupportedLocale } from '@/config/locales';
import {
  beginTotpEnrollment,
  confirmTotpEnrollment,
  disableTotp,
  myRegisteredEventSlugs,
  saveMyContactPreferences,
  setMyPassword,
  updateMyDetails,
  updateMyPhoto,
} from '@/features/registration';
import { getActiveConferenceSlug } from '@/features/events';
import { publishedDirectory } from '@/shared/cache/publish';

const optional = (value: FormDataEntryValue | null): string | undefined => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text.length > 0 ? text : undefined;
};

/*
 * The profile is the account's, not a conference's: saving it here
 * updates the guest everywhere they are registered.
 */
/*
 * A link a person typed is a link someone else may click, so only two
 * schemes are ever stored: https, and http for the rare internal
 * address that still has no certificate. Anything else — javascript:,
 * data:, a typo — is dropped rather than corrected, because a stored
 * `javascript:` URL is a cross-site scripting payload waiting for the
 * day something renders it as an anchor. A bare domain
 * ("example.org") is given https:// instead of being refused; that is
 * plainly what the person meant.
 */
const safeLink = (raw: string | undefined): string => {
  const value = (raw ?? '').trim();
  if (value === '') {
    return '';
  }
  const candidate = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)
    ? value
    : `https://${value}`;
  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? url.toString()
      : '';
  } catch {
    return '';
  }
};

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
    headline: optional(formData.get('headline')),
    bio: optional(formData.get('bio')),
    /*
     * The two link rows are read as a pair and rewritten whole: a link
     * whose address was cleared is a link the person removed, and
     * merging row by row would keep it alive forever.
     */
    links: [0, 1]
      .map((index) => ({
        label: optional(formData.get(`linkLabel${index}`)) ?? '',
        url: safeLink(optional(formData.get(`linkUrl${index}`))),
      }))
      .filter((link) => link.url.length > 0),
  });

  /*
   * Name, organisation and role are exactly what a directory tile shows,
   * so an edit here changes the shared listing and it has to be dropped.
   */
  const [slugs, active] = await Promise.all([
    myRegisteredEventSlugs().catch((): string[] => []),
    getActiveConferenceSlug(locale).catch(() => null),
  ]);
  for (const slug of new Set([...slugs, ...(active ? [active] : [])])) {
    publishedDirectory(slug);
  }

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
    directory: formData.get('directory') === 'on',
  });

  /*
   * The directory this person just joined or left is assembled once and
   * shared between viewers, so it has to be told. Every conference they
   * hold a place in, and the live one besides — a guest who signed up
   * for a workshop without an event-level registration appears in the
   * live conference's directory without appearing in that list.
   *
   * Someone switching themselves off expects to be gone now. This is
   * what makes that true rather than true within half a minute.
   */
  const [slugs, active] = await Promise.all([
    myRegisteredEventSlugs().catch((): string[] => []),
    getActiveConferenceSlug(locale).catch(() => null),
  ]);
  for (const slug of new Set([...slugs, ...(active ? [active] : [])])) {
    publishedDirectory(slug);
  }

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
