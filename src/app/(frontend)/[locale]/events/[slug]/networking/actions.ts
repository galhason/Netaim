'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isSupportedLocale } from '@/config/locales';
import {
  saveMyProfile,
  manageMyConnection,
  requestConnection,
  respondToRequest,
  proposeMeeting,
  confirmMeeting,
  cancelMeeting,
  suggestAnotherTime,
} from '@/features/networking';

const toIso = (value: FormDataEntryValue | null): string => {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) {
    return '';
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
};

const optionalText = (value: FormDataEntryValue | null): string | undefined => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text.length > 0 ? text : undefined;
};

export const saveProfileAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  const locale = String(formData.get('locale') ?? 'he');
  if (!slug || !isSupportedLocale(locale)) {
    return;
  }
  const links = [1, 2]
    .map((index) => ({
      label: optionalText(formData.get(`linkLabel${index}`)) ?? '',
      url: optionalText(formData.get(`linkUrl${index}`)) ?? '',
    }))
    .filter((link) => link.url.length > 0);
  await saveMyProfile(slug, {
    headline: optionalText(formData.get('headline')),
    bio: optionalText(formData.get('bio')),
    interests: optionalText(formData.get('interests')),
    links,
    visible: formData.get('visible') === 'on',
    availableForMeetings: formData.get('availableForMeetings') === 'on',
  });
  revalidatePath(`/${locale}/events/${slug}/networking`);
};

export const requestConnectionAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  const locale = String(formData.get('locale') ?? 'he');
  const addresseeId = String(formData.get('addresseeId') ?? '');
  if (!slug || !isSupportedLocale(locale) || !addresseeId) {
    return;
  }
  await requestConnection(slug, addresseeId, optionalText(formData.get('message')));
  revalidatePath(`/${locale}/events/${slug}/networking`);
};

export const respondConnectionAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  const locale = String(formData.get('locale') ?? 'he');
  const connectionId = String(formData.get('connectionId') ?? '');
  const response = String(formData.get('response') ?? '');
  if (!slug || !isSupportedLocale(locale) || !connectionId) {
    return;
  }
  if (response !== 'accept' && response !== 'decline') {
    return;
  }
  await respondToRequest(connectionId, response);
  revalidatePath(`/${locale}/events/${slug}/networking`);
};

export const proposeMeetingAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  const locale = String(formData.get('locale') ?? 'he');
  const guestId = String(formData.get('guestId') ?? '');
  const startsAt = toIso(formData.get('startsAt'));
  const endsAt = toIso(formData.get('endsAt'));
  if (!slug || !isSupportedLocale(locale) || !guestId || !startsAt || !endsAt) {
    return;
  }
  await proposeMeeting(
    slug,
    guestId,
    startsAt,
    endsAt,
    optionalText(formData.get('location')),
  );
  revalidatePath(`/${locale}/events/${slug}/networking`);
};

/*
 * The living connection's controls (Connection Framework v1.0):
 * mute / unmute / remove. The service enforces membership, the private
 * nature of mute, and the pure lifecycle.
 */
export const manageConnectionAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  const locale = String(formData.get('locale') ?? 'he');
  const connectionId = String(formData.get('connectionId') ?? '');
  const manage = String(formData.get('manage') ?? '');
  if (!isSupportedLocale(locale) || !connectionId) {
    return;
  }
  if (manage !== 'mute' && manage !== 'unmute' && manage !== 'remove') {
    return;
  }
  await manageMyConnection(connectionId, manage);
  if (slug) {
    revalidatePath(`/${locale}/events/${slug}/networking`);
  }
  revalidatePath(`/${locale}/me/networking`);
};

export const confirmMeetingAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  const locale = String(formData.get('locale') ?? 'he');
  const meetingId = String(formData.get('meetingId') ?? '');
  if (!slug || !isSupportedLocale(locale) || !meetingId) {
    return;
  }
  const decision = await confirmMeeting(slug, meetingId);
  if (!decision.ok && decision.reason === 'conflict') {
    redirect(`/${locale}/events/${slug}/networking?meetingError=conflict`);
  }
  revalidatePath(`/${locale}/events/${slug}/networking`);
};

export const suggestMeetingTimeAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  const locale = String(formData.get('locale') ?? 'he');
  const meetingId = String(formData.get('meetingId') ?? '');
  const startsAt = toIso(formData.get('startsAt'));
  const endsAt = toIso(formData.get('endsAt'));
  if (!slug || !isSupportedLocale(locale) || !meetingId || !startsAt || !endsAt) {
    return;
  }
  await suggestAnotherTime(slug, meetingId, startsAt, endsAt);
  revalidatePath(`/${locale}/events/${slug}/networking`);
  revalidatePath(`/${locale}/me/messages`);
};

export const cancelMeetingAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  const locale = String(formData.get('locale') ?? 'he');
  const meetingId = String(formData.get('meetingId') ?? '');
  if (!slug || !isSupportedLocale(locale) || !meetingId) {
    return;
  }
  await cancelMeeting(meetingId);
  revalidatePath(`/${locale}/events/${slug}/networking`);
};
