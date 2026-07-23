import type { RegistrationDomainEvent } from '@/registration-engine';

/*
 * The in-process event bus (Platform-Engines §4: the bus mechanism lives
 * in Foundation). Emitters never know their subscribers. Delivery is
 * best-effort and synchronous in v1; a durable queue is a future swap.
 * A handler failure never propagates to the emitting domain transaction.
 */
type RegistrationHandler = (
  event: RegistrationDomainEvent,
) => void | Promise<void>;

/*
 * Subscribers are keyed so re-evaluation of the composition root (dev
 * HMR) replaces rather than duplicates a handler.
 */
const handlers = new Map<string, RegistrationHandler>();

export const subscribeRegistration = (
  key: string,
  handler: RegistrationHandler,
): void => {
  handlers.set(key, handler);
};

export const emitRegistration = async (
  event: RegistrationDomainEvent,
): Promise<void> => {
  for (const handler of handlers.values()) {
    try {
      await handler(event);
    } catch {
      // Notification/Audit failures must not block the domain write.
    }
  }
};
