import { FALLBACK_LOCALE } from '@/config/locales';
import type { RegistrationDomainEvent } from '@/registration-engine';
import type { ChannelAdapter } from './channel/channel';
import type { NotificationOutboxRepository } from './outbox/outbox';
import { renderRegistrationNotification } from './templates/registration-templates';

/*
 * The reactive handler: it renders the localized template, hands the
 * message to the channel, and records the result in the outbox. It is a
 * subscriber — the Registration Engine emits without knowing it exists.
 */
export const createRegistrationNotifier =
  (outbox: NotificationOutboxRepository, channel: ChannelAdapter) =>
  async (event: RegistrationDomainEvent): Promise<void> => {
    const rendered = renderRegistrationNotification(event.type, FALLBACK_LOCALE);
    const message = {
      participantId: event.participantId,
      eventSlug: event.eventSlug,
      type: event.type,
      locale: FALLBACK_LOCALE,
      subject: rendered.subject,
      body: rendered.body,
    };
    const status = await channel.deliver(message);
    await outbox.enqueue({ ...message, status });
  };
