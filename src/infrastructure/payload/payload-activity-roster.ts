import { relationshipId, type RelationshipValue } from '@/auth';
import type {
  ActivityRoster,
  ActivityRosterSource,
  RosterPerson,
  RosterStatus,
} from '@/features/studio/types/activity-roster';
import { actorContext } from './payload-context';
import { LIVE_STATUSES } from './payload-participation';

/*
 * Who signed up for each of a conference's activities, for the Studio's
 * spreadsheet export.
 *
 * Read under the acting creator, never with overrideAccess — the same
 * door as the logistics roster, because this too is a list of people's
 * telephone numbers. A place that was cancelled is not a sign-up; a
 * place held, awaiting approval, waiting or already checked in is. An
 * account that was anonymised has no name or number left to give, and
 * is left out rather than exported as a blank row.
 */
const ROSTER_LIMIT = 5000;

interface SessionDoc {
  id: number | string;
  title?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
}

interface PlaceDoc {
  session: RelationshipValue;
  participant: RelationshipValue;
  status?: string | null;
}

const isRosterStatus = (value: string): value is RosterStatus =>
  value === 'confirmed' || value === 'pending' || value === 'waitlisted' || value === 'attended';

const STATUS_ORDER: Record<RosterStatus, number> = {
  confirmed: 0,
  attended: 1,
  pending: 2,
  waitlisted: 3,
};

export const payloadActivityRosters: ActivityRosterSource = async (slug, locale, sessionId) => {
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
    return { activities: [] };
  }
  const timeZone = typeof event.timezone === 'string' && event.timezone ? event.timezone : undefined;
  const withZone = timeZone ? { timeZone } : {};

  /*
   * One named activity, archived or not — it was asked for by name. All
   * of them otherwise, minus the shelved ones, in the programme's order.
   */
  const sessions = await payload.find({
    collection: 'sessions',
    where: sessionId
      ? { and: [{ id: { equals: sessionId } }, { event: { equals: event.id } }] }
      : { and: [{ event: { equals: event.id } }, { archivedAt: { exists: false } }] },
    locale,
    depth: 0,
    sort: 'startsAt',
    limit: ROSTER_LIMIT,
    pagination: false,
    overrideAccess: false,
    user,
  });
  const activities = sessions.docs as unknown as SessionDoc[];
  if (activities.length === 0) {
    return { ...withZone, activities: [] };
  }

  const places = await payload.find({
    collection: 'session-registrations',
    where: {
      and: [
        { event: { equals: event.id } },
        { session: { in: activities.map((activity) => activity.id) } },
        { status: { in: LIVE_STATUSES } },
      ],
    },
    depth: 0,
    limit: ROSTER_LIMIT,
    pagination: false,
    overrideAccess: false,
    user,
  });
  const held = places.docs as unknown as PlaceDoc[];

  const participantIds = [
    ...new Set(held.map((place) => String(relationshipId(place.participant) ?? '')).filter(Boolean)),
  ];
  const people = participantIds.length
    ? await payload.find({
        collection: 'participants',
        where: { id: { in: participantIds } },
        depth: 0,
        limit: ROSTER_LIMIT,
        pagination: false,
        overrideAccess: false,
        user,
      })
    : { docs: [] };
  const byId = new Map(
    people.docs
      .filter((person) => !person.anonymizedAt)
      .map((person) => [String(person.id), person]),
  );

  const bySession = new Map<string, RosterPerson[]>();
  for (const place of held) {
    const session = String(relationshipId(place.session) ?? '');
    const person = byId.get(String(relationshipId(place.participant) ?? ''));
    const status = place.status ?? '';
    if (!session || !person || !isRosterStatus(status)) {
      continue;
    }
    const list = bySession.get(session) ?? [];
    list.push({
      name: person.name ?? '',
      phone: person.phone ?? '',
      email: person.email ?? '',
      status,
    });
    bySession.set(session, list);
  }

  const rosters = activities.map((activity): ActivityRoster => {
    const list = (bySession.get(String(activity.id)) ?? []).sort(
      (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.name.localeCompare(b.name, locale),
    );
    return {
      sessionId: String(activity.id),
      title: activity.title ?? '',
      ...(activity.startsAt ? { startsAt: activity.startsAt } : {}),
      ...(activity.endsAt ? { endsAt: activity.endsAt } : {}),
      people: list,
    };
  });
  return { ...withZone, activities: rosters };
};
