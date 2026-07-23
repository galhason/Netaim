import type { Locale } from '@/config/locales';
import { listAllGrants, revokeGrant } from '@/features/access';
import {
  cancelRegistration,
  registerForEvent,
} from '@/features/registration';
import {
  deleteParticipantAdmin,
  listParticipantsAdmin,
  participantSessionRepository,
  registrationRepository,
  searchParticipantAccounts,
  updateParticipantAdmin,
} from '@/infrastructure';
import type {
  AccountSearchView,
  ParticipantAdminView,
} from '../types/participants';

export const getParticipantsAdmin = (): Promise<ParticipantAdminView[]> =>
  listParticipantsAdmin();

export const searchAccounts = (
  query: string,
): Promise<AccountSearchView[]> => searchParticipantAccounts(query);

export const renameParticipant = (id: string, name: string): Promise<void> =>
  updateParticipantAdmin(id, { name });

export const setParticipantBlocked = (
  id: string,
  blocked: boolean,
): Promise<void> => updateParticipantAdmin(id, { blocked });

/*
 * Registration governance from the panel (approved decision §8): the
 * operator can release a guest's place, or move them to another
 * conference — a cancel and a fresh registration through the same
 * engine every guest uses, so capacity, waitlists and notifications
 * all behave as if the guest did it themselves.
 */
export const cancelParticipantRegistration = async (
  slug: string,
  participantId: string,
): Promise<boolean> => {
  const held = await registrationRepository
    .statusForParticipant(slug, participantId)
    .catch(() => null);
  if (!held) {
    return false;
  }
  await cancelRegistration(slug, held.registrationId);
  return true;
};

export type MoveRegistrationOutcome =
  | { ok: true }
  | { ok: false; reason: 'notRegistered' | 'failed' };

export const moveParticipantRegistration = async (
  participantId: string,
  fromSlug: string,
  toSlug: string,
  locale: Locale,
): Promise<MoveRegistrationOutcome> => {
  const participant = await participantSessionRepository
    .participantById(participantId)
    .catch(() => null);
  if (!participant) {
    return { ok: false, reason: 'failed' };
  }
  const released = await cancelParticipantRegistration(
    fromSlug,
    participantId,
  ).catch(() => false);
  if (!released) {
    return { ok: false, reason: 'notRegistered' };
  }
  try {
    await registerForEvent(toSlug, locale, {
      name: participant.name,
      email: participant.email,
    });
    return { ok: true };
  } catch {
    return { ok: false, reason: 'failed' };
  }
};

/*
 * Full deletion (approved decision §4): grants fall first — taking the
 * derived principal with them — then every trace of the person.
 */
export const deleteParticipantAccount = async (id: string): Promise<void> => {
  const grants = await listAllGrants();
  for (const grant of grants) {
    if (grant.accountId === id) {
      await revokeGrant(grant.id).catch(() => undefined);
    }
  }
  await deleteParticipantAdmin(id);
};
