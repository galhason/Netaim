export interface CapacityCounts {
  limit: number | null;
  confirmed: number;
  pending: number;
  waitlisted: number;
}

export type CapacityState = 'unlimited' | 'open' | 'limited' | 'full';

export interface CapacityView {
  limit: number | null;
  confirmed: number;
  reserved: number;
  waiting: number;
  available: number | null;
  state: CapacityState;
}

/*
 * "Limited availability" begins when fewer than 20% of the places
 * remain free (PRD §3.2) — a declared band, not a magic number.
 */
const LIMITED_RATIO = 0.2;

export const computeCapacity = ({
  limit,
  confirmed,
  pending,
  waitlisted,
}: CapacityCounts): CapacityView => {
  const base = {
    limit,
    confirmed,
    reserved: pending,
    waiting: waitlisted,
  };

  if (limit === null) {
    return { ...base, available: null, state: 'unlimited' };
  }

  const available = Math.max(0, limit - confirmed - pending);
  const state: CapacityState =
    available === 0
      ? 'full'
      : available < limit * LIMITED_RATIO
        ? 'limited'
        : 'open';

  return { ...base, available, state };
};
