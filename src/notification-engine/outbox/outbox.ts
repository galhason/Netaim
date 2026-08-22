import type { DeliveryStatus, OutboxMessage } from '../channel/channel';

export interface NotificationRecord extends OutboxMessage {
  status: DeliveryStatus;
}

/*
 * A read projection of a persisted notification, for the Studio outbox
 * view. The recipient is resolved to a human label at the seam.
 */
export interface NotificationView {
  id: string;
  type: string;
  channel: string;
  status: DeliveryStatus;
  locale: string;
  subject: string;
  body: string;
  recipient: string | null;
  createdAt?: string;
  sentAt?: string;
}

/*
 * The outbox persists every queued message (Platform-Engines §2.10).
 * Delivery failure never blocks the emitting domain transaction.
 */
/* A failed message, with what retry needs to decide about it. */
export interface PendingDelivery {
  id: string;
  participantId: string;
  eventSlug: string;
  type: string;
  locale: string;
  subject: string;
  body: string;
  attempts: number;
  lastAttemptAt: number;
}

export interface NotificationOutboxRepository {
  enqueue: (record: NotificationRecord) => Promise<void>;
  /* Failed messages, oldest first, for the dispatcher to reconsider. */
  listFailed: (limit: number) => Promise<PendingDelivery[]>;
  /* Records the outcome of one more attempt. */
  markAttempt: (
    id: string,
    status: DeliveryStatus,
    error?: string,
  ) => Promise<void>;
  listByEvent: (slug: string) => Promise<NotificationView[]>;
  /*
   * The guest-facing feed: broadcasts (no recipient) plus messages
   * addressed to this participant — never anyone else's.
   */
  listFeedFor: (
    slug: string,
    participantId: string,
  ) => Promise<NotificationView[]>;
}
