export interface OutboxMessage {
  participantId: string;
  eventSlug: string;
  type: string;
  locale: string;
  subject: string;
  body: string;
}

export type DeliveryStatus = 'queued' | 'sent' | 'failed';

/*
 * The channel contract (Registration-Architecture §8). A real provider
 * (SMTP/API) implements this at deployment; the dev channel records the
 * message to the outbox without sending, so confirmation and magic-link
 * work end to end without a provider.
 */
export interface ChannelAdapter {
  deliver: (message: OutboxMessage) => Promise<DeliveryStatus>;
}

export const devChannel: ChannelAdapter = {
  deliver: () => Promise.resolve('queued'),
};
