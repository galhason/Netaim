import { FALLBACK_LOCALE } from '@/config/locales';
import type { RegistrationDomainEvent } from '@/registration-engine';
import type {
  ChannelAdapter,
  DeliveryStatus,
  OutboxMessage,
  Recipient,
} from './channel/channel';
import type { NotificationOutboxRepository } from './outbox/outbox';
import {
  renderRegistrationNotification,
  type RegistrationTemplateOverrides,
} from './templates/registration-templates';

/*
 * How the notifier learns what one conference chose to say. Injected
 * like the outbox and the channel: the engine renders words, it never
 * goes looking for them.
 */
export type TemplateOverrideLookup = (
  eventSlug: string,
) => Promise<RegistrationTemplateOverrides | undefined>;

/*
 * How the notifier learns where to send. This was the gap that kept the
 * platform from ever sending anything: the message carried a
 * participant id and no address, so a real channel had nothing to
 * deliver to and only the dev channel — which sends nowhere — could
 * satisfy the contract.
 */
export type RecipientLookup = (participantId: string) => Promise<Recipient>;

/*
 * Send one message that was composed elsewhere — the magic link, an
 * announcement — and record what happened.
 *
 * This exists because the sign-in link path called `outbox.enqueue`
 * directly with `status: 'queued'`, which recorded a message and never
 * offered it to a channel. It could not have sent even with a provider
 * configured. Both paths now go through here, so there is one place
 * where "we decided to send this" becomes "we tried".
 */
export const createNotificationSender =
  (
    outbox: NotificationOutboxRepository,
    channel: ChannelAdapter,
    recipientFor?: RecipientLookup,
  ) =>
  async (message: OutboxMessage): Promise<DeliveryStatus> => {
    const recipient = recipientFor
      ? await recipientFor(message.participantId).catch(() => null)
      : null;
    const status = await channel.deliver(message, recipient);
    await outbox.enqueue({ ...message, status });
    return status;
  };

/*
 * The reactive handler: it renders the localized template, hands the
 * message to the channel, and records the result in the outbox. It is a
 * subscriber — the Registration Engine emits without knowing it exists.
 */
export const createRegistrationNotifier =
  (
    outbox: NotificationOutboxRepository,
    channel: ChannelAdapter,
    overridesFor?: TemplateOverrideLookup,
    recipientFor?: RecipientLookup,
  ) =>
  async (event: RegistrationDomainEvent): Promise<void> => {
    /*
     * A conference that has written nothing, or a lookup that fails,
     * leaves the platform's wording in place. A guest is never sent an
     * empty email because a settings read timed out.
     */
    const overrides = overridesFor
      ? await overridesFor(event.eventSlug).catch(() => undefined)
      : undefined;
    const rendered = renderRegistrationNotification(
      event.type,
      FALLBACK_LOCALE,
      overrides,
    );
    const message = {
      participantId: event.participantId,
      eventSlug: event.eventSlug,
      type: event.type,
      locale: FALLBACK_LOCALE,
      subject: rendered.subject,
      body: rendered.body,
    };
    /*
     * The address is resolved for delivery and then discarded — it is
     * never part of the record the outbox persists.
     */
    const recipient = recipientFor
      ? await recipientFor(event.participantId).catch(() => null)
      : null;
    const status = await channel.deliver(message, recipient);
    await outbox.enqueue({ ...message, status });
  };
