import { relationshipId } from '@/auth';
import { getSystemPayload } from './payload-context';

/*
 * Who is taking part, and who may be seen.
 *
 * Both questions used to be answered separately at every call site, and
 * the answers drifted: the directory asked for a place in an activity
 * while the gate on connecting asked for an event-level registration,
 * so a guest could be listed among the people to meet and refused the
 * moment they tried to reach one. This module is the single answer, and
 * the reason it is a module rather than a helper beside one reader.
 */

/*
 * The statuses that mean a person is really taking part. Cancelled,
 * declined, expired and no-show are records of something that did not
 * happen, and counting them would let someone who withdrew keep the run
 * of the conference.
 */
export const LIVE_STATUSES = ['pending', 'confirmed', 'waitlisted', 'attended'];

type Payload = Awaited<ReturnType<typeof getSystemPayload>>;

/*
 * Two proofs, because there are two ways in. Holding a place in one of
 * the conference's activities is the usual one: the conference is the
 * site rather than something joined from a list, and looking only for
 * an event-level registration is why the directory was once empty for
 * people who had signed up for workshops and were plainly attending.
 * But the registration form still exists, and a guest who filled it in
 * and has not yet chosen an activity is attending too — leaving them
 * out is the same mistake pointing the other way.
 */
export const participantsTakingPart = async (
  payload: Payload,
  eventId: number,
): Promise<Set<string>> => {
  const [places, registrations] = await Promise.all([
    payload.find({
      collection: 'session-registrations',
      where: {
        and: [
          { event: { equals: eventId } },
          { status: { in: LIVE_STATUSES } },
        ],
      },
      depth: 0,
      pagination: false,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'registrations',
      where: {
        and: [
          { event: { equals: eventId } },
          { status: { in: LIVE_STATUSES } },
        ],
      },
      depth: 0,
      pagination: false,
      overrideAccess: true,
    }),
  ]);
  const taking = new Set<string>();
  for (const row of [...places.docs, ...registrations.docs]) {
    const id = String(relationshipId(row.participant));
    if (id) {
      taking.add(id);
    }
  }
  return taking;
};

export interface ListableRow {
  contactPrefs?: { directory?: boolean | null } | null;
  blocked?: boolean | null;
  anonymizedAt?: string | null;
}

/*
 * Whether this person may appear in a directory at all.
 *
 * Everyone taking part is listed unless they said no. The question is
 * still asked on the registration form — ticked by default now — and
 * the profile carries a switch to leave the room at any time; "no" is
 * the one answer that hides a person, and it is theirs to give.
 *
 * It was opt-in once, on the client's original specification, and the
 * client reversed it on 19 October 2026: a directory where everyone
 * waits to be the first in is not a room. The practical failure was
 * worse than an empty day — a person who had opted in was silently
 * dropped the next time anything re-registered them, because every
 * registration rewrote the answer from a form that had not asked it.
 * That rewrite is gone too: a registration writes the answer only when
 * the form actually asked for one.
 *
 * What a listing exposes stays narrow — the name, role and organisation
 * the person already gave. Phone, email and WhatsApp remain closed
 * until they approve a connection; those are separate preferences and
 * this one does not touch them.
 *
 * Absent means listed: a row written before the field existed, or a
 * relationship returned as a bare id, must not read as a refusal.
 */
export const mayBeListed = (row: ListableRow | null | undefined): boolean =>
  row
    ? row.contactPrefs?.directory !== false &&
      row.blocked !== true &&
      !row.anonymizedAt
    : false;
