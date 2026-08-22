export { devChannel } from './channel/channel';
export type {
  ChannelAdapter,
  DeliveryStatus,
  OutboxMessage,
  Recipient,
} from './channel/channel';
export type {
  NotificationRecord,
  NotificationView,
  NotificationOutboxRepository,
  PendingDelivery,
} from './outbox/outbox';
export {
  MAX_ATTEMPTS,
  backoffMs,
  isDue,
  isExhausted,
} from './outbox/retry';
export type { RetryCandidate } from './outbox/retry';
export { createDispatcher } from './dispatcher';
export type { DispatchReport } from './dispatcher';
export {
  defaultRegistrationTemplate,
  renderRegistrationNotification,
} from './templates/registration-templates';
export type {
  RegistrationTemplateOverrides,
  RenderedNotification,
} from './templates/registration-templates';
export {
  createNotificationSender,
  createRegistrationNotifier,
} from './notification-service';
export type {
  RecipientLookup,
  TemplateOverrideLookup,
} from './notification-service';
