import type { MeetingStatus } from '@/networking-engine';

export interface MeetingSummary {
  id: string;
  hostId: string;
  hostName: string;
  guestId: string;
  guestName: string;
  startsAt: string;
  endsAt: string;
  location?: string;
  status: MeetingStatus;
}

export interface MyMeeting extends MeetingSummary {
  role: 'host' | 'guest';
  otherId: string;
  otherName: string;
}

export interface MeetingRepository {
  listForParticipant: (
    slug: string,
    participantId: string,
  ) => Promise<MeetingSummary[]>;
  listConfirmedForParticipant: (
    slug: string,
    participantId: string,
  ) => Promise<MeetingSummary[]>;
  getById: (id: string) => Promise<MeetingSummary | null>;
  create: (
    slug: string,
    hostId: string,
    guestId: string,
    startsAt: string,
    endsAt: string,
    location?: string,
  ) => Promise<MeetingSummary>;
  setStatus: (id: string, status: MeetingStatus) => Promise<MeetingSummary>;
}
