export interface OutboxMessage {
  participantId: string;
  eventSlug: string;
  type: string;
  locale: string;
  subject: string;
  body: string;
  /*
   * Presentation, carried with the message but never persisted: the
   * outbox writes subject and body only, so what a channel does with
   * these is a delivery concern. `body` always says the same thing in
   * words, so a text-only reader loses nothing.
   */
  highlight?: { label: string; value: string };
  cta?: { label: string; href: string };
}

export type DeliveryStatus = 'queued' | 'sent' | 'failed';

/*
 * Where a message is actually going. Deliberately a separate argument
 * rather than a field on `OutboxMessage`: the address is a delivery
 * concern, and `OutboxMessage` is what gets persisted. Putting it on the
 * record would copy every participant's email address into a second
 * table that nothing needs it in.
 *
 * `null` means the address could not be resolved — a deleted or
 * anonymised account. The channel refuses rather than guessing.
 */
export type Recipient = { email: string; name?: string } | null;

/*
 * The channel contract (Registration-Architecture §8). A real provider
 * (SMTP/API) implements this at deployment; the dev channel records the
 * message to the outbox without sending, so confirmation and magic-link
 * work end to end without a provider.
 */
export interface ChannelAdapter {
  deliver: (
    message: OutboxMessage,
    recipient: Recipient,
  ) => Promise<DeliveryStatus>;
}

/*
 * No provider configured: the message is recorded and not sent. This is
 * the correct behaviour for local development, and `queued` is honest —
 * it says the platform accepted the message and did not deliver it,
 * which is exactly what happened.
 */
export const devChannel: ChannelAdapter = {
  deliver: () => Promise.resolve('queued'),
};
