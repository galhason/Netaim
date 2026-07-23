import type { ConnectionStatus } from '@/networking-engine';

export interface ConnectionSummary {
  id: string;
  requesterId: string;
  requesterName: string;
  addresseeId: string;
  addresseeName: string;
  status: ConnectionStatus;
  mutedBy?: string;
  message?: string;
}

export interface MyConnection extends ConnectionSummary {
  direction: 'incoming' | 'outgoing';
  otherId: string;
  otherName: string;
  /*
   * Mute is private (Connection Framework v1.0): true only for the side
   * that muted. The other side sees an ordinary accepted connection.
   */
  muted: boolean;
}

export interface ConnectionRepository {
  listForParticipant: (
    slug: string,
    participantId: string,
  ) => Promise<ConnectionSummary[]>;
  findActiveBetween: (
    slug: string,
    a: string,
    b: string,
  ) => Promise<ConnectionSummary | null>;
  getById: (id: string) => Promise<ConnectionSummary | null>;
  create: (
    slug: string,
    requesterId: string,
    addresseeId: string,
    message?: string,
  ) => Promise<ConnectionSummary>;
  setStatus: (
    id: string,
    status: ConnectionStatus,
    mutedBy?: string | null,
  ) => Promise<ConnectionSummary>;
}
