/*
 * How many of a guest's conferences the aggregate screens reach into.
 *
 * `/me/messages` runs three reads per conference (connections, meetings,
 * announcements) and `/me/networking` one, so this number multiplies
 * directly into query count. Unbounded, a guest who has joined thirty
 * conferences would fire ninety queries to draw one page.
 *
 * It was `.slice(0, 5)` inline in four places: a real limit, but an
 * invisible one — a sixth conference simply was not there, with nothing
 * on screen to say so. Naming it makes the trade-off reviewable, and the
 * screens now tell the guest when it bites.
 *
 * The honest fix is a single aggregate query across conferences rather
 * than a fan-out, which needs a repository method that does not exist
 * yet. Until then this is a bound, not a solution.
 */
export const JOINED_CONFERENCE_FANOUT = 5;

/* True when the guest has more conferences than the screens reach. */
export const fanoutTruncates = (joined: readonly unknown[]): boolean =>
  joined.length > JOINED_CONFERENCE_FANOUT;
