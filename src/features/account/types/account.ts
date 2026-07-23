import type { RegistrationStatus } from '@/registration-engine';

export interface AccountConference {
  slug: string;
  title: string;
  startsAt?: string;
  endsAt?: string;
  location?: string;
  dateLabel: string;
  posterUrl?: string;
  status: RegistrationStatus | null;
  /* Title of the conference already held that blocks joining this one. */
  conflictWith?: string;
}

export interface AccountOverview {
  id: string;
  name: string;
  email: string;
  joined: AccountConference[];
  available: AccountConference[];
}

export type JoinOutcome =
  | { ok: true; status: RegistrationStatus }
  | { ok: false; reason: 'conflict'; conflictTitle: string }
  | { ok: false; reason: 'unavailable' }
  | { ok: false; reason: 'signed-out' };
