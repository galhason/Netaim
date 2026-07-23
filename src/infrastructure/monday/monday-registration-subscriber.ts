import type { RegistrationDomainEvent } from '@/registration-engine';
import type { ParticipantSessionRepository } from '@/features/registration/types/identity';
import { createMondayItem, mondayEnabled, postMondayUpdate } from './monday-client';

const INITIAL_EVENTS: ReadonlySet<string> = new Set([
  'registration.confirmed',
  'registration.pending',
  'registration.waitlisted',
]);

const OUTCOME_LABEL: Record<string, string> = {
  'registration.confirmed': 'Registered',
  'registration.pending': 'Awaiting approval',
  'registration.waitlisted': 'Waiting list',
};

/*
 * Realizes the reserved RegistrationOutboundGateway (Registration-
 * Architecture §16): a new registration becomes an item on the
 * organization's monday board. It runs only when MONDAY_* is set, only on
 * the initial outcome (so each registration is one item), and never blocks
 * the domain write (the event bus isolates it). Updating the same item on
 * later status transitions needs the item id stored on the registration —
 * a following increment.
 */
export const createMondayRegistrationSubscriber =
  (participants: ParticipantSessionRepository) =>
  async (event: RegistrationDomainEvent): Promise<void> => {
    if (!mondayEnabled() || !INITIAL_EVENTS.has(event.type)) {
      return;
    }
    const participant = await participants
      .participantById(event.participantId)
      .catch(() => null);
    const name = participant?.name || 'Participant';
    const itemId = await createMondayItem(`${name} · ${event.eventSlug}`);
    if (!itemId) {
      return;
    }
    const label = OUTCOME_LABEL[event.type] ?? event.type;
    const email = participant?.email ? ` — ${participant.email}` : '';
    await postMondayUpdate(itemId, `${label}${email}`);
  };
