import type { RegistrationDomainEvent } from '../events/registration-events';

/*
 * The hybrid integration seam (Registration-Architecture §16). In-platform
 * is the system of record; these declared contracts let an external or
 * government registration system attach later as an adapter — a sibling of
 * Notification — without reshaping the engine. Reserved; no implementation
 * and no live wiring in v1.
 */
export interface RegistrationInboundGateway {
  importRegistrations: (source: string) => Promise<number>;
}

export interface RegistrationOutboundGateway {
  publish: (event: RegistrationDomainEvent) => Promise<void>;
}
