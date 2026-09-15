import { conferencesDueForPurge, type PurgeCandidate } from '@/infrastructure';

/*
 * The retention policy, in one place.
 *
 * The platform gathers people for a conference and keeps them only for
 * as long as the conference needs them: a short grace period after the
 * event ends, and then everything personal about that conference is
 * erased — the connections, the conversations, the meetings, the
 * notices, the registrations, and the accounts that existed for it
 * alone.
 *
 * The number lives in one constant and one environment variable rather
 * than scattered through the code, because a retention period promised
 * in a privacy policy must be checkable against the thing that enforces
 * it. Anyone reading either should reach the same number.
 *
 * **Erasing is not here, and that is deliberate.** This module only
 * answers what is due. The erasure itself is a command an administrator
 * runs by hand — `npm run retention:purge -- <slug> --confirm` — because
 * a deletion that any request, timer or stray import could trigger is a
 * deletion that eventually happens when nobody meant it to, and the
 * people it removes do not come back.
 */
export const DEFAULT_RETENTION_DAYS = 7;

export const retentionDays = (): number => {
  const raw = Number(process.env.RETENTION_DAYS);
  return Number.isFinite(raw) && raw > 0
    ? Math.floor(raw)
    : DEFAULT_RETENTION_DAYS;
};

/* What is already past its deadline — a look, with nothing erased. */
export const conferencesAwaitingPurge = (
  now: number = Date.now(),
): Promise<PurgeCandidate[]> => conferencesDueForPurge(retentionDays(), now);
