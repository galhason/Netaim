import type { Where } from 'payload';
import type {
  AccountSearchView,
  ParticipantAdminView,
  ParticipantRegistrationLine,
} from '@/features/studio/types/participants';
import { actorContext } from './payload-context';

/*
 * Participant administration for the Studio: every registered person,
 * their conferences and their state — read and governed under the
 * acting creator, never through the engine's panel.
 */
const PARTICIPANT_LIMIT = 200;
const REGISTRATION_LIMIT = 600;

const requireActor = async () => {
  const context = await actorContext();
  if (!context) {
    throw new Error('Sign-in required');
  }
  return context;
};

export const payloadListParticipantsAdmin = async (): Promise<
  ParticipantAdminView[]
> => {
  const { payload, user } = await requireActor();
  const [participants, registrations] = await Promise.all([
    payload.find({
      collection: 'participants',
      overrideAccess: false,
      user,
      sort: '-createdAt',
      limit: PARTICIPANT_LIMIT,
      depth: 0,
    }),
    payload.find({
      collection: 'registrations',
      overrideAccess: false,
      user,
      limit: REGISTRATION_LIMIT,
      depth: 1,
    }),
  ]);

  const linesByParticipant = new Map<string, ParticipantRegistrationLine[]>();
  for (const registration of registrations.docs) {
    const participant = registration.participant;
    const participantId =
      typeof participant === 'object' && participant !== null
        ? String(participant.id)
        : String(participant ?? '');
    const event = registration.event;
    const eventTitle =
      typeof event === 'object' && event !== null ? event.title : String(event ?? '');
    const eventSlug =
      typeof event === 'object' && event !== null ? (event.slug ?? '') : '';
    if (!participantId) {
      continue;
    }
    const lines = linesByParticipant.get(participantId) ?? [];
    lines.push({
      eventTitle,
      eventSlug,
      status: registration.status ?? 'pending',
    });
    linesByParticipant.set(participantId, lines);
  }

  return participants.docs.map((participant) => ({
    id: String(participant.id),
    name: participant.name ?? '',
    email: participant.email ?? '',
    organization:
      typeof participant.organization === 'object' &&
      participant.organization !== null
        ? participant.organization.name
        : undefined,
    blocked: participant.blocked === true,
    registrations: linesByParticipant.get(String(participant.id)) ?? [],
  }));
};

const SEARCH_LIMIT = 50;

export const payloadSearchAccounts = async (
  query: string,
): Promise<AccountSearchView[]> => {
  const { payload, user } = await requireActor();
  const trimmed = query.trim();
  const result = await payload.find({
    collection: 'participants',
    overrideAccess: false,
    user,
    depth: 0,
    limit: SEARCH_LIMIT,
    sort: 'name',
    ...(trimmed
      ? {
          where: {
            or: [
              { name: { like: trimmed } },
              { email: { like: trimmed } },
            ],
          },
        }
      : {}),
  });
  return result.docs.map((participant) => ({
    id: String(participant.id),
    name: participant.name ?? '',
    email: participant.email ?? '',
    blocked: participant.blocked === true,
  }));
};

export const payloadUpdateParticipantAdmin = async (
  id: string,
  input: { name?: string; blocked?: boolean },
): Promise<void> => {
  const { payload, user } = await requireActor();
  await payload.update({
    collection: 'participants',
    id,
    overrideAccess: false,
    user,
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.blocked !== undefined ? { blocked: input.blocked } : {}),
    },
  });
};

/*
 * Full account deletion (approved decision: the panel can delete people
 * and their data rather than keep them needlessly). Every trace goes:
 * sign-ins, registrations, workshop places, the networking room, then
 * the account row itself. Grants are revoked by the caller first so the
 * derived principal falls with them.
 *
 * The order is the database's, not ours. Every table that names a
 * person does so with a column that may not be empty, so the row has to
 * go before the person does — and a chat message names its connection
 * the same way, so messages go before connections. This used to sweep
 * four of the nine tables and swallow every failure, and the last
 * statement then fell over the five it had skipped: a person who had
 * ever signed in with a password, met someone, blocked someone or sent
 * a message could not be deleted, and the panel showed a server error
 * instead of a word. A report survives on purpose: it keeps the names
 * it copied, and its relationships are allowed to empty.
 */
type Sweepable =
  | 'account-sessions'
  | 'participant-sessions'
  | 'registrations'
  | 'session-registrations'
  | 'networking-chat-messages'
  | 'networking-meetings'
  | 'networking-blocks'
  | 'networking-connections';

export const payloadDeleteParticipantAccount = async (
  id: string,
): Promise<void> => {
  const { payload, user } = await requireActor();
  const participantId = Number(id);

  const sweep = async (collection: Sweepable, where: Where) => {
    const result = await payload.delete({
      collection,
      where,
      overrideAccess: false,
      user,
    });
    /* A bulk delete reports per-row failures instead of throwing; one left behind strands the account. */
    if (result.errors.length > 0) {
      throw new Error(`Could not clear ${collection} for participant ${id}`);
    }
  };
  const theirs = (field: string): Where => ({ [field]: { equals: participantId } });
  const either = (a: string, b: string): Where => ({
    or: [theirs(a), theirs(b)],
  });

  await sweep('account-sessions', theirs('participant'));
  await sweep('participant-sessions', theirs('participant'));
  await sweep('registrations', theirs('participant'));
  await sweep('session-registrations', theirs('participant'));

  const connections = await payload.find({
    collection: 'networking-connections',
    where: either('requester', 'addressee'),
    depth: 0,
    pagination: false,
    overrideAccess: false,
    user,
  });
  const connectionIds = connections.docs.map((doc) => doc.id);
  if (connectionIds.length > 0) {
    await sweep('networking-chat-messages', { connection: { in: connectionIds } });
  }
  await sweep('networking-chat-messages', theirs('sender'));
  await sweep('networking-meetings', either('host', 'guest'));
  await sweep('networking-blocks', either('blocker', 'blocked'));
  await sweep('networking-connections', either('requester', 'addressee'));

  await payload.delete({
    collection: 'participants',
    id,
    overrideAccess: false,
    user,
  });
};
