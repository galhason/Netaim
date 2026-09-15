'use server';

import { redirect } from 'next/navigation';
import { isSupportedLocale } from '@/config/locales';
import { revalidatePath } from 'next/cache';
import {
  blockParticipant,
  cancelMeeting,
  confirmMeeting,
  connectToParticipant,
  isReportReason,
  manageMyConnection,
  proposeMeeting,
  reportParticipant,
  respondToRequest,
  suggestAnotherTime,
  unblockParticipant,
} from '@/features/networking';

/*
 * These moved here from the conference's own networking page when that
 * page was retired. The community hub is where a guest's connections
 * and meetings live now — one address for the whole platform rather
 * than one per conference — so the actions live beside it.
 */
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

const here = (locale: string) => `/${locale}/me/networking`;

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

/*
 * The two safety acts. Both answer on the same page the guest is
 * standing on, and neither ever tells the other side anything.
 */
export const blockParticipantAction = async (formData: FormData) => {
  const raw = String(formData.get('locale') ?? 'he');
  const locale = isSupportedLocale(raw) ? raw : 'he';
  const targetId = String(formData.get('participantId') ?? '');

  const done = await blockParticipant(targetId);
  redirect(`/${locale}/me/networking?request=${done ? 'blocked' : 'failed'}`);
};

export const unblockParticipantAction = async (formData: FormData) => {
  const raw = String(formData.get('locale') ?? 'he');
  const locale = isSupportedLocale(raw) ? raw : 'he';
  const targetId = String(formData.get('participantId') ?? '');

  await unblockParticipant(targetId);
  redirect(`/${locale}/me/networking?request=unblocked`);
};

export const reportParticipantAction = async (formData: FormData) => {
  const raw = String(formData.get('locale') ?? 'he');
  const locale = isSupportedLocale(raw) ? raw : 'he';
  const targetId = String(formData.get('participantId') ?? '');
  const reasonRaw = String(formData.get('reason') ?? 'other');
  const slug = String(formData.get('slug') ?? '').trim();

  const outcome = await reportParticipant({
    targetId,
    reason: isReportReason(reasonRaw) ? reasonRaw : 'other',
    details: String(formData.get('details') ?? ''),
    eventSlug: slug || undefined,
    /*
     * Blocking alongside the report is offered, not assumed: someone
     * reporting spam may have no wish to sever a colleague, and the box
     * arrives ticked because the common case is wanting it to stop now.
     */
    alsoBlock: formData.get('alsoBlock') === 'on',
  });
  redirect(`/${locale}/me/networking?request=report-${outcome}`);
};

/*
 * Answering a request that is waiting. The conference comes from the
 * connection itself inside the service, never from this form.
 */
export const respondConnectionAction = async (formData: FormData) => {
  const raw = String(formData.get('locale') ?? 'he');
  const locale = isSupportedLocale(raw) ? raw : 'he';
  const connectionId = String(formData.get('connectionId') ?? '');
  const response = String(formData.get('response') ?? '');
  if (!connectionId || (response !== 'accept' && response !== 'decline')) {
    return;
  }
  await respondToRequest(connectionId, response);
  revalidatePath(here(locale));
};

/*
 * The living connection's controls (Connection Framework v1.0):
 * mute / unmute / remove, and withdraw for a request not yet answered.
 * The service enforces membership, the private nature of mute, and the
 * lifecycle itself.
 */
export const manageConnectionAction = async (formData: FormData) => {
  const raw = String(formData.get('locale') ?? 'he');
  const locale = isSupportedLocale(raw) ? raw : 'he';
  const connectionId = String(formData.get('connectionId') ?? '');
  const manage = String(formData.get('manage') ?? '');
  if (!connectionId) {
    return;
  }
  if (
    manage !== 'mute' &&
    manage !== 'unmute' &&
    manage !== 'remove' &&
    manage !== 'withdraw'
  ) {
    return;
  }
  await manageMyConnection(connectionId, manage);
  revalidatePath(here(locale));
};

export const proposeMeetingAction = async (formData: FormData) => {
  const raw = String(formData.get('locale') ?? 'he');
  const locale = isSupportedLocale(raw) ? raw : 'he';
  const slug = String(formData.get('slug') ?? '');
  const guestId = String(formData.get('guestId') ?? '');
  const startsAt = toIso(formData.get('startsAt'));
  const endsAt = toIso(formData.get('endsAt'));
  if (!slug || !guestId || !startsAt || !endsAt) {
    return;
  }
  const meeting = await proposeMeeting(
    slug,
    guestId,
    startsAt,
    endsAt,
    optionalText(formData.get('location')),
  );
  redirect(`${here(locale)}?meeting=${meeting ? 'proposed' : 'refused'}`);
};

export const confirmMeetingAction = async (formData: FormData) => {
  const raw = String(formData.get('locale') ?? 'he');
  const locale = isSupportedLocale(raw) ? raw : 'he';
  const slug = String(formData.get('slug') ?? '');
  const meetingId = String(formData.get('meetingId') ?? '');
  if (!slug || !meetingId) {
    return;
  }
  const decision = await confirmMeeting(slug, meetingId);
  if (!decision.ok && decision.reason === 'conflict') {
    redirect(`${here(locale)}?meeting=conflict`);
  }
  revalidatePath(here(locale));
};

export const suggestMeetingTimeAction = async (formData: FormData) => {
  const raw = String(formData.get('locale') ?? 'he');
  const locale = isSupportedLocale(raw) ? raw : 'he';
  const slug = String(formData.get('slug') ?? '');
  const meetingId = String(formData.get('meetingId') ?? '');
  const startsAt = toIso(formData.get('startsAt'));
  const endsAt = toIso(formData.get('endsAt'));
  if (!slug || !meetingId || !startsAt || !endsAt) {
    return;
  }
  await suggestAnotherTime(slug, meetingId, startsAt, endsAt);
  revalidatePath(here(locale));
  revalidatePath(`/${locale}/me/messages`);
};

export const cancelMeetingAction = async (formData: FormData) => {
  const raw = String(formData.get('locale') ?? 'he');
  const locale = isSupportedLocale(raw) ? raw : 'he';
  const meetingId = String(formData.get('meetingId') ?? '');
  if (!meetingId) {
    return;
  }
  await cancelMeeting(meetingId);
  revalidatePath(here(locale));
};
