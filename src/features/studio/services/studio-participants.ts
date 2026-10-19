import type { Locale } from '@/config/locales';
import { listAllGrants } from '@/features/access';
import { mayRevokeRole, type Grant } from '@/permission-engine';
import {
  cancelRegistration,
  isStrongPassword,
  passwordHashFor,
  registerForEvent,
} from '@/features/registration';
import {
  deleteParticipantAdmin,
  listParticipantsAdmin,
  participantSessionRepository,
  readParticipantAccount,
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
 * The keys to an account, turned by the Admin.
 *
 * A person who cannot get their sign-in link — the address was saved
 * wrong, the mailbox changed, the mail is lost on the way — used to be
 * stuck: nothing in the Studio could correct the address or hand them a
 * way in. The Admin can now set the address the person signs in with,
 * their phone, and a password to give them in person.
 *
 * The address is settled to one spelling and may not already belong to
 * another account. A password must meet the platform's own policy; it
 * is hashed the way the person's own choice would be, and every open
 * session of theirs is closed — a new key is usually cut because the
 * old one was lost, and a lost key opens doors until the lock changes.
 */
export type AccountEditOutcome =
  | { ok: true; emailChanged: boolean; phoneChanged: boolean }
  | { ok: false; reason: 'invalid' | 'taken' | 'failed' };

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const updateParticipantAccount = async (
  id: string,
  input: { email: string; phone: string },
): Promise<AccountEditOutcome> => {
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();
  if (!EMAIL_SHAPE.test(email)) {
    return { ok: false, reason: 'invalid' };
  }
  const current = await readParticipantAccount(id).catch(() => null);
  if (!current) {
    return { ok: false, reason: 'failed' };
  }
  const emailChanged = current.email.trim().toLowerCase() !== email;
  const phoneChanged = current.phone !== phone;
  if (emailChanged) {
    const holder = await participantSessionRepository
      .credentialsByEmail(email)
      .catch(() => null);
    if (holder && holder.participantId !== id) {
      return { ok: false, reason: 'taken' };
    }
  }
  if (!emailChanged && !phoneChanged) {
    return { ok: true, emailChanged, phoneChanged };
  }
  try {
    await updateParticipantAdmin(id, {
      ...(emailChanged ? { email } : {}),
      ...(phoneChanged ? { phone } : {}),
    });
  } catch {
    return { ok: false, reason: 'failed' };
  }
  return { ok: true, emailChanged, phoneChanged };
};

export type PasswordSetOutcome =
  | { ok: true }
  | { ok: false; reason: 'weak' | 'failed' };

export const setParticipantPassword = async (
  id: string,
  password: string,
): Promise<PasswordSetOutcome> => {
  if (!isStrongPassword(password)) {
    return { ok: false, reason: 'weak' };
  }
  try {
    await participantSessionRepository.setPasswordHash(id, passwordHashFor(password));
    await participantSessionRepository.revokeAllSessions(id, new Date().toISOString());
  } catch {
    return { ok: false, reason: 'failed' };
  }
  return { ok: true };
};

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
 * Full deletion (approved decision §4): every trace of the person,
 * grants and the principal they derived included, in one transaction.
 *
 * Only when every one of those grants could fall at this hand. Deleting
 * the account is otherwise a way round the grant rules: an Admin could
 * not take the developer role from a developer, but could delete them;
 * and the last Owner or last Developer would vanish with their account.
 * The question is asked of every grant before anything moves, and the
 * grants themselves go with the rest of the deletion rather than one by
 * one before it — a deletion that stopped half way used to leave a
 * person with no grants, no registrations and an account that still
 * said their address was taken.
 */
export const deleteParticipantAccount = async (
  id: string,
  actorGrants: readonly Grant[],
): Promise<boolean> => {
  const all = await listAllGrants();
  const held = all.filter((grant) => grant.accountId === id);
  const keeps = (role: string) => all.some((grant) => grant.role === role && grant.accountId !== id);
  const refused = held.some(
    (grant) =>
      !mayRevokeRole(actorGrants, grant.role) ||
      ((grant.role === 'owner' || grant.role === 'developer') && !keeps(grant.role)),
  );
  if (refused) {
    return false;
  }
  await deleteParticipantAdmin(id);
  return true;
};
