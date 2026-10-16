import type { Where } from 'payload';
import type { getSystemPayload } from './payload-context';

type PayloadInstance = Awaited<ReturnType<typeof getSystemPayload>>;

const idOf = (value: unknown): string | null => {
  if (value == null) return null;
  if (typeof value === 'object') {
    const id = (value as { id?: unknown }).id;
    return id == null ? null : String(id);
  }
  return String(value);
};

/* A relationship read at any depth, as ids. */
export const relationIds = (value: unknown): string[] =>
  (Array.isArray(value) ? value : [])
    .map(idOf)
    .filter((id): id is string => id !== null);

/*
 * Who is on a conference's speakers page, and why.
 *
 * Nobody is stored there. A speaker is on the page when the conference's
 * standing activities name them — counted here, per speaker — or when the
 * conference is listed on their card by hand (`events`). The two together
 * are one `where`, so every reader of a roster (the platform's pages, the
 * marketing API the WordPress site reads, the Studio) asks the same
 * question and gets the same people.
 */
export const conferenceRoster = async (
  payload: PayloadInstance,
  eventId: string | number,
): Promise<{ where: Where; activities: Map<string, number> }> => {
  const sessions = await payload
    .find({
      collection: 'sessions',
      where: { and: [{ event: { equals: eventId } }, { archivedAt: { exists: false } }] },
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: { speakers: true },
    })
    .catch(() => null);
  const activities = new Map<string, number>();
  for (const session of (sessions?.docs ?? []) as { speakers?: unknown }[]) {
    for (const id of new Set(relationIds(session.speakers))) {
      activities.set(id, (activities.get(id) ?? 0) + 1);
    }
  }
  const listed: Where = { events: { in: [eventId] } };
  const where: Where =
    activities.size > 0 ? { or: [listed, { id: { in: [...activities.keys()] } }] } : listed;
  return { where, activities };
};
