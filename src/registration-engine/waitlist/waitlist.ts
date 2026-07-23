export interface WaitlistEntry {
  registrationId: string;
  position: number;
  offerExpiresAt?: string;
}

const byPosition = (a: WaitlistEntry, b: WaitlistEntry): number =>
  a.position - b.position;

export const orderWaitlist = (
  entries: readonly WaitlistEntry[],
): WaitlistEntry[] => [...entries].sort(byPosition);

export const nextInLine = (
  entries: readonly WaitlistEntry[],
): WaitlistEntry | null => orderWaitlist(entries)[0] ?? null;

export const offerExpired = (entry: WaitlistEntry, now: number): boolean =>
  entry.offerExpiresAt !== undefined &&
  !Number.isNaN(Date.parse(entry.offerExpiresAt)) &&
  Date.parse(entry.offerExpiresAt) <= now;

/*
 * The first `freedSlots` entries in line become promotable. The timed
 * expiry sweep (a sequenced follow-up) calls this after freeing offers;
 * the manual promote action calls it with freedSlots = 1.
 */
export const promotable = (
  entries: readonly WaitlistEntry[],
  freedSlots: number,
): WaitlistEntry[] =>
  freedSlots <= 0 ? [] : orderWaitlist(entries).slice(0, freedSlots);
