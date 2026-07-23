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
 * registrations, workshop places, sessions, networking, then the
 * account row itself. Grants are revoked by the caller first so the
 * derived principal falls with them. Auxiliary collections fail soft —
 * a missing engine never strands the deletion.
 */
export const payloadDeleteParticipantAccount = async (
  id: string,
): Promise<void> => {
  const { payload, user } = await requireActor();
  const participantId = Number(id);

  const sweep = async (
    collection:
      | 'registrations'
      | 'session-registrations'
      | 'participant-sessions'
      | 'networking-profiles',
  ) => {
    await payload
      .delete({
        collection,
        where: { participant: { equals: participantId } },
        overrideAccess: false,
        user,
      })
      .catch(() => undefined);
  };

  await sweep('registrations');
  await sweep('session-registrations');
  await sweep('participant-sessions');
  await sweep('networking-profiles');
  await payload
    .delete({
      collection: 'networking-connections',
      where: {
        or: [
          { requester: { equals: participantId } },
          { addressee: { equals: participantId } },
        ],
      },
      overrideAccess: false,
      user,
    })
    .catch(() => undefined);

  await payload.delete({
    collection: 'participants',
    id,
    overrideAccess: false,
    user,
  });
};
