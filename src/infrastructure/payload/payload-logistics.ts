import { relationshipId } from '@/auth';
/*
 * Straight at the catalogue, not through the feature's barrel: that
 * barrel pulls in the registration services, which import this very
 * module's neighbours from the composition root — a cycle, and the
 * symptom is a dead site with "cannot access before initialization".
 * The constants module imports nothing but the locale list.
 */
import { dietaryKeyOf } from '@/features/registration/constants/dietary';
import type { LogisticsRow } from '@/features/studio/types/logistics';
import { actorContext } from './payload-context';
import { LIVE_STATUSES } from './payload-participation';

/*
 * The logistics roster for one conference.
 *
 * Read under the acting creator, never with overrideAccess: this is the
 * one screen that puts phone numbers and dietary requirements of four
 * hundred people on a single page, and the door to it should be the
 * same door as everything else in the Studio.
 *
 * Who counts as coming is deliberately the wider question. A guest who
 * filled in the registration form is coming; so is a guest who never
 * did but holds a place in three of the conference's activities —
 * since the conference became the site, that is the ordinary way in.
 * Feeding only the first group is how a caterer ends up short.
 */
const ROSTER_LIMIT = 2000;

interface Taking {
  status: string | null;
  activities: number;
  joinedAt?: string;
}

const earliest = (a: string | undefined, b: string | undefined) => {
  if (!a) return b;
  if (!b) return a;
  return Date.parse(a) <= Date.parse(b) ? a : b;
};

export const payloadEventLogistics = async (
  slug: string,
): Promise<LogisticsRow[]> => {
  const context = await actorContext();
  if (!context) {
    throw new Error('Sign-in required');
  }
  const { payload, user } = context;

  const events = await payload.find({
    collection: 'events',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    user,
  });
  const event = events.docs[0];
  if (!event) {
    return [];
  }

  const [registrations, places] = await Promise.all([
    payload.find({
      collection: 'registrations',
      where: {
        and: [
          { event: { equals: event.id } },
          { status: { in: LIVE_STATUSES } },
        ],
      },
      depth: 0,
      limit: ROSTER_LIMIT,
      pagination: false,
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: 'session-registrations',
      where: {
        and: [
          { event: { equals: event.id } },
          { status: { in: LIVE_STATUSES } },
        ],
      },
      depth: 0,
      limit: ROSTER_LIMIT,
      pagination: false,
      overrideAccess: false,
      user,
    }),
  ]);

  const taking = new Map<string, Taking>();
  const note = (id: string, patch: Partial<Taking>) => {
    const held = taking.get(id) ?? { status: null, activities: 0 };
    taking.set(id, {
      status: patch.status ?? held.status,
      activities: held.activities + (patch.activities ?? 0),
      ...(earliest(held.joinedAt, patch.joinedAt)
        ? { joinedAt: earliest(held.joinedAt, patch.joinedAt) }
        : {}),
    });
  };

  for (const row of registrations.docs) {
    const id = String(relationshipId(row.participant) ?? '');
    if (id) {
      note(id, {
        status: row.status ?? 'pending',
        ...(row.submittedAt ? { joinedAt: row.submittedAt } : {}),
      });
    }
  }
  for (const row of places.docs) {
    const id = String(relationshipId(row.participant) ?? '');
    if (id) {
      note(id, { activities: 1 });
    }
  }

  if (taking.size === 0) {
    return [];
  }

  const people = await payload.find({
    collection: 'participants',
    where: { id: { in: [...taking.keys()] } },
    depth: 0,
    limit: ROSTER_LIMIT,
    pagination: false,
    overrideAccess: false,
    user,
  });

  return people.docs
    .filter((person) => !person.anonymizedAt)
    .map((person) => {
      const held = taking.get(String(person.id)) ?? {
        status: null,
        activities: 0,
      };
      const dietary = person.dietary ?? '';
      return {
        participantId: String(person.id),
        name: person.name ?? '',
        email: person.email ?? '',
        phone: person.phone ?? '',
        dietary,
        dietaryKey: dietaryKeyOf(dietary),
        accessibility: person.accessibilityNeeds ?? '',
        organization:
          typeof person.organization === 'object' && person.organization !== null
            ? (person.organization.name ?? '')
            : '',
        registrationStatus: held.status,
        activities: held.activities,
        ...(held.joinedAt ? { joinedAt: held.joinedAt } : {}),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'he'));
};
