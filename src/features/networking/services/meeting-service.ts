import { meetingRepository } from '@/infrastructure';
import { currentParticipant } from '@/features/registration';
import {
  canCancelMeeting,
  canConfirmMeeting,
  hasConflict,
} from '@/networking-engine';
import type { MeetingSummary, MyMeeting } from '../types/meeting';

export const proposeMeeting = async (
  slug: string,
  guestId: string,
  startsAt: string,
  endsAt: string,
  location?: string,
): Promise<MeetingSummary | null> => {
  const me = await currentParticipant();
  if (!me || me.id === guestId) {
    return null;
  }
  const start = Date.parse(startsAt);
  const end = Date.parse(endsAt);
  if (Number.isNaN(start) || Number.isNaN(end) || start >= end) {
    return null;
  }
  return meetingRepository.create(slug, me.id, guestId, startsAt, endsAt, location);
};

export interface MeetingDecision {
  ok: boolean;
  reason?: 'conflict' | 'invalid';
  meeting?: MeetingSummary;
}

export const confirmMeeting = async (
  slug: string,
  meetingId: string,
): Promise<MeetingDecision> => {
  const me = await currentParticipant();
  if (!me) {
    return { ok: false, reason: 'invalid' };
  }
  const meeting = await meetingRepository.getById(meetingId);
  if (
    !meeting ||
    meeting.guestId !== me.id ||
    !canConfirmMeeting(meeting.status)
  ) {
    return { ok: false, reason: 'invalid' };
  }
  const confirmed = await meetingRepository.listConfirmedForParticipant(
    slug,
    me.id,
  );
  const conflict = hasConflict(
    { startsAt: meeting.startsAt, endsAt: meeting.endsAt },
    confirmed.map((existing) => ({
      startsAt: existing.startsAt,
      endsAt: existing.endsAt,
    })),
  );
  if (conflict) {
    return { ok: false, reason: 'conflict' };
  }
  const updated = await meetingRepository.setStatus(meetingId, 'confirmed');
  return { ok: true, meeting: updated };
};

export const cancelMeeting = async (
  meetingId: string,
): Promise<MeetingSummary | null> => {
  const me = await currentParticipant();
  if (!me) {
    return null;
  }
  const meeting = await meetingRepository.getById(meetingId);
  if (
    !meeting ||
    (meeting.hostId !== me.id && meeting.guestId !== me.id) ||
    !canCancelMeeting(meeting.status)
  ) {
    return null;
  }
  return meetingRepository.setStatus(meetingId, 'cancelled');
};

/*
 * "Suggest another time" (Connection Framework v1.0): the old proposal
 * folds, a fresh one leaves in the opposite direction — the original
 * proposer now decides. Same engine, no new states.
 */
export const suggestAnotherTime = async (
  slug: string,
  meetingId: string,
  startsAt: string,
  endsAt: string,
): Promise<MeetingDecision> => {
  const me = await currentParticipant();
  if (!me) {
    return { ok: false, reason: 'invalid' };
  }
  const meeting = await meetingRepository.getById(meetingId);
  if (
    !meeting ||
    (meeting.hostId !== me.id && meeting.guestId !== me.id) ||
    !canCancelMeeting(meeting.status)
  ) {
    return { ok: false, reason: 'invalid' };
  }
  const start = Date.parse(startsAt);
  const end = Date.parse(endsAt);
  if (Number.isNaN(start) || Number.isNaN(end) || start >= end) {
    return { ok: false, reason: 'invalid' };
  }
  const otherId = meeting.hostId === me.id ? meeting.guestId : meeting.hostId;
  await meetingRepository.setStatus(meetingId, 'cancelled');
  const created = await meetingRepository.create(
    slug,
    me.id,
    otherId,
    startsAt,
    endsAt,
    meeting.location,
  );
  return { ok: true, meeting: created };
};

export const myMeetings = async (slug: string): Promise<MyMeeting[]> => {
  const me = await currentParticipant();
  if (!me) {
    return [];
  }
  const list = await meetingRepository.listForParticipant(slug, me.id);
  return list
    .filter((meeting) => meeting.status !== 'cancelled')
    .map((meeting) => {
      const host = meeting.hostId === me.id;
      return {
        ...meeting,
        role: host ? 'host' : 'guest',
        otherId: host ? meeting.guestId : meeting.hostId,
        otherName: host ? meeting.guestName : meeting.hostName,
      };
    });
};
