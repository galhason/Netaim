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
export interface NotificationOutboxRepository {
  enqueue: (record: NotificationRecord) => Promise<void>;
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
