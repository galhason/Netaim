import type { Locale } from '@/config/locales';
import {
  applyTransition,
  computeCapacity,
  decideOutcome,
  eventForOutcome,
  eventForTransition,
  type RegistrationStatus,
} from '@/registration-engine';
import { emitRegistration } from '@/foundation/event-bus';
import {
  registrationRepository,
  registrationSettingsRepository,
} from '@/infrastructure';
import type {
  RegisterInput,
  RegisterResult,
  RegistrationSummary,
} from '../types/registration';

const nowIso = (): string => new Date().toISOString();

const OUTCOME_STATUS: Record<RegisterResult['outcome'], RegistrationStatus> = {
  confirmed: 'confirmed',
  pending: 'pending',
  waitlisted: 'waitlisted',
};

/*
 * The submission path (Registration-Architecture §3–§4). Capacity is read
 * live and the outcome decided by the engine; the transactional capacity
 * guarantee is the repository's concern. The engine's emitted event flows
 * to Notification through the bus.
 */
export const registerForEvent = async (
  slug: string,
  locale: Locale,
  input: RegisterInput,
): Promise<RegisterResult> => {
  const settings = await registrationSettingsRepository.getByEvent(slug, locale);
  if (!settings) {
    throw new Error('Registration is not open for this event');
  }

  const counts = await registrationRepository.countsByEvent(slug);
  const capacity = computeCapacity({
    limit: settings.capacity ?? null,
    confirmed: counts.confirmed,
    pending: counts.pending,
    waitlisted: counts.waitlisted,
  });

  const outcome = decideOutcome(settings.mode, capacity);
  if (outcome === 'waitlisted' && !settings.waitlistEnabled) {
    throw new Error('Registration is full');
  }

  const waitlistPosition =
    outcome === 'waitlisted' ? counts.waitlisted + 1 : null;

  const persisted = await registrationRepository.register(
    slug,
    input,
    OUTCOME_STATUS[outcome],
    waitlistPosition,
  );

  await emitRegistration({
    type: eventForOutcome(outcome),
    registrationId: persisted.registrationId,
    participantId: persisted.participantId,
    eventSlug: slug,
    occurredAt: nowIso(),
  });

  return {
    outcome,
    registrationId: persisted.registrationId,
    participantId: persisted.participantId,
  };
};

const transition = async (
  slug: string,
  registrationId: string,
  to: RegistrationStatus,
  patch?: { cancelledReason?: string; waitlistPosition?: number | null },
): Promise<RegistrationSummary> => {
  const current = await registrationRepository.getById(registrationId);
  if (!current) {
    throw new Error('Registration not found');
  }
  const result = applyTransition(current.status, to);
  if (!result.ok) {
    return current;
  }
  const updated = await registrationRepository.setStatus(
    registrationId,
    result.status,
    patch,
  );
  const eventType = eventForTransition(current.status, result.status);
  if (eventType) {
    await emitRegistration({
      type: eventType,
      registrationId,
      participantId: updated.participant.id,
      eventSlug: slug,
      occurredAt: nowIso(),
    });
  }
  return updated;
};

export const approveRegistration = (
  slug: string,
  registrationId: string,
): Promise<RegistrationSummary> => transition(slug, registrationId, 'confirmed');

export const declineRegistration = (
  slug: string,
  registrationId: string,
): Promise<RegistrationSummary> => transition(slug, registrationId, 'declined');

export const promoteFromWaitlist = (
  slug: string,
  registrationId: string,
): Promise<RegistrationSummary> => transition(slug, registrationId, 'confirmed');

export const cancelRegistration = (
  slug: string,
  registrationId: string,
  reason?: string,
): Promise<RegistrationSummary> =>
  transition(slug, registrationId, 'cancelled', { cancelledReason: reason });

export const listRegistrations = (
  slug: string,
): Promise<RegistrationSummary[]> => registrationRepository.listByEvent(slug);

export const getRegistrationCounts = (
  slug: string,
): ReturnType<typeof registrationRepository.countsByEvent> =>
  registrationRepository.countsByEvent(slug);
