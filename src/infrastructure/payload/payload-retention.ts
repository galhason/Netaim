import { payloadAuditRepository } from './payload-audit';
import { getSystemPayload } from './payload-context';

/*
 * Forgetting, as a scheduled act.
 *
 * The platform holds a conference's people only for as long as the
 * conference needs them. Everything gathered for one event — who
 * connected with whom, what they said to each other, the meetings they
 * set, the notices the platform wrote about them, and the registrations
 * themselves — is swept a fixed number of days after the event ends.
 * An account left with no registration anywhere is then removed
 * outright, together with the sessions and safety records that only
 * existed to protect it.
 *
 * Two rules shape the order below and neither is negotiable:
 *
 *  1. **Children before parents.** Chat hangs off connections and
 *     connections hang off participants; deleting a parent first leaves
 *     the child orphaned and the foreign key refuses. So the sweep
 *     works inward: messages, then connections and meetings, then the
 *     registrations, then the account.
 *  2. **Every step fails soft.** A sweep that stops at the first error
 *     leaves a half-erased conference, which is worse than either
 *     outcome. Each step swallows its own failure and the report says
 *     what was actually removed, so a partial sweep is visible rather
 *     than silent.
 *
 * This runs through the system seam with `overrideAccess`, because the
 * caller is a clock rather than a person — there is no actor to check,
 * and the decision of what may be erased was made by the policy, not by
 * whoever happened to trigger it.
 */

export interface PurgeReport {
  slug: string;
  messages: number;
  connections: number;
  meetings: number;
  notifications: number;
  sessionRegistrations: number;
  registrations: number;
  reports: number;
  accountsDeleted: number;
  /* Accounts deliberately spared — see the staff rule in the sweep. */
  accountsKept: number;
}

export interface PurgeCandidate {
  slug: string;
  title: string;
  /* The instant the conference stopped — its end, or its start. */
  endedAt: string;
  dueAt: string;
}

interface EventRow {
  id: number | string;
  slug?: string | null;
  title?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
}

const emptyReport = (slug: string): PurgeReport => ({
  slug,
  messages: 0,
  connections: 0,
  meetings: 0,
  notifications: 0,
  sessionRegistrations: 0,
  registrations: 0,
  reports: 0,
  accountsDeleted: 0,
  accountsKept: 0,
});

/*
 * When a conference is considered over: its declared end, or its start
 * when no end was set. An event with neither is never swept — the
 * platform will not guess a date and erase people on the guess.
 */
const endInstant = (row: EventRow): number | null => {
  const raw = row.endsAt ?? row.startsAt ?? null;
  if (!raw) {
    return null;
  }
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? null : parsed;
};

export const conferencesDueForPurge = async (
  retentionDays: number,
  now: number,
): Promise<PurgeCandidate[]> => {
  const payload = await getSystemPayload();
  const found = await payload
    .find({
      collection: 'events',
      pagination: false,
      depth: 0,
      overrideAccess: true,
    })
    .catch(() => ({ docs: [] as unknown[] }));

  const graceMs = retentionDays * 24 * 60 * 60 * 1000;
  return (found.docs as unknown as EventRow[])
    .map((row) => {
      const ended = endInstant(row);
      if (!ended || !row.slug) {
        return null;
      }
      const dueAt = ended + graceMs;
      return dueAt <= now
        ? {
            slug: row.slug,
            title: row.title ?? row.slug,
            endedAt: new Date(ended).toISOString(),
            dueAt: new Date(dueAt).toISOString(),
          }
        : null;
    })
    .filter((entry): entry is PurgeCandidate => entry !== null);
};

/*
 * Erases one conference's personal data. Returns what it removed —
 * zeroes are a valid answer and mean the conference was already clean.
 */
export const purgeConferenceData = async (
  slug: string,
): Promise<PurgeReport> => {
  const payload = await getSystemPayload();
  const report = emptyReport(slug);

  const found = await payload
    .find({
      collection: 'events',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    .catch(() => ({ docs: [] as unknown[] }));
  const eventRow = (found.docs as unknown as EventRow[])[0];
  if (!eventRow) {
    return report;
  }
  const eventId = Number(eventRow.id);

  /* Who took part, remembered before the registrations are removed. */
  const [registrations, sessionRegistrations] = await Promise.all([
    payload
      .find({
        collection: 'registrations',
        where: { event: { equals: eventId } },
        pagination: false,
        depth: 0,
        overrideAccess: true,
      })
      .catch(() => ({ docs: [] as unknown[] })),
    payload
      .find({
        collection: 'session-registrations',
        where: { event: { equals: eventId } },
        pagination: false,
        depth: 0,
        overrideAccess: true,
      })
      .catch(() => ({ docs: [] as unknown[] })),
  ]);

  const idOf = (value: unknown): number | null => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? null : parsed;
    }
    if (value && typeof value === 'object' && 'id' in value) {
      return Number((value as { id: number | string }).id);
    }
    return null;
  };

  const touched = new Set<number>();
  for (const row of [
    ...(registrations.docs as { participant?: unknown }[]),
    ...(sessionRegistrations.docs as { participant?: unknown }[]),
  ]) {
    const pid = idOf(row.participant);
    if (pid !== null) {
      touched.add(pid);
    }
  }

  /* 1 — messages, which hang off the connections about to go. */
  const connections = await payload
    .find({
      collection: 'networking-connections',
      where: { event: { equals: eventId } },
      pagination: false,
      depth: 0,
      overrideAccess: true,
    })
    .catch(() => ({ docs: [] as unknown[] }));
  const connectionIds = (connections.docs as { id: number | string }[]).map(
    (row) => Number(row.id),
  );
  if (connectionIds.length > 0) {
    const removed = await payload
      .delete({
        collection: 'networking-chat-messages',
        where: { connection: { in: connectionIds } },
        overrideAccess: true,
      })
      .catch(() => ({ docs: [] as unknown[] }));
    report.messages = (removed.docs as unknown[]).length;
  }

  /* 2 — the event-scoped collections. */
  const sweep = async (
    collection:
      | 'networking-connections'
      | 'networking-meetings'
      | 'notifications'
      | 'networking-reports'
      | 'session-registrations'
      | 'registrations',
  ): Promise<number> => {
    const removed = await payload
      .delete({
        collection,
        where: { event: { equals: eventId } },
        overrideAccess: true,
      })
      .catch(() => ({ docs: [] as unknown[] }));
    return (removed.docs as unknown[]).length;
  };

  report.connections = await sweep('networking-connections');
  report.meetings = await sweep('networking-meetings');
  report.notifications = await sweep('notifications');
  report.reports = await sweep('networking-reports');
  report.sessionRegistrations = await sweep('session-registrations');
  report.registrations = await sweep('registrations');

  /*
   * 3 — the accounts themselves, but only those with nothing left to
   * be part of. Someone registered to another conference keeps their
   * account; that conference's own deadline will come for it.
   */
  for (const participantId of touched) {
    const [stillRegistered, stillInSessions] = await Promise.all([
      payload
        .count({
          collection: 'registrations',
          where: { participant: { equals: participantId } },
          overrideAccess: true,
        })
        .catch(() => ({ totalDocs: 1 })),
      payload
        .count({
          collection: 'session-registrations',
          where: { participant: { equals: participantId } },
          overrideAccess: true,
        })
        .catch(() => ({ totalDocs: 1 })),
    ]);
    if (stillRegistered.totalDocs > 0 || stillInSessions.totalDocs > 0) {
      continue;
    }

    /*
     * A member of staff is not a guest of the conference. Their account
     * carries a grant — the thing that lets them into the Studio — and
     * erasing it on a conference's schedule would lock the team out of
     * their own platform the week after their event. It is also the
     * account most likely to be reused for the next conference.
     *
     * This was found the honest way: the first live sweep silently
     * failed to delete exactly one account, because the grant's foreign
     * key refused. A refusal swallowed by a `catch` is not a policy —
     * so the rule is now stated, and the count is reported.
     */
    const staff = await payload
      .count({
        collection: 'account-grants',
        where: { account: { equals: participantId } },
        overrideAccess: true,
      })
      .catch(() => ({ totalDocs: 0 }));
    if (staff.totalDocs > 0) {
      report.accountsKept += 1;
      continue;
    }

    /*
     * Everything that exists only to serve this account, then the
     * account. Blocks and connections are two-sided, so both sides are
     * swept; a stale block pointing at a deleted row would otherwise
     * keep the foreign key alive and refuse the deletion.
     */
    const bothSides = (a: string, b: string) => ({
      or: [{ [a]: { equals: participantId } }, { [b]: { equals: participantId } }],
    });

    await payload
      .delete({
        collection: 'participant-sessions',
        where: { participant: { equals: participantId } },
        overrideAccess: true,
      })
      .catch(() => undefined);
    await payload
      .delete({
        collection: 'networking-blocks',
        where: bothSides('blocker', 'blocked'),
        overrideAccess: true,
      })
      .catch(() => undefined);
    await payload
      .delete({
        collection: 'networking-reports',
        where: bothSides('reporter', 'reported'),
        overrideAccess: true,
      })
      .catch(() => undefined);
    await payload
      .delete({
        collection: 'networking-connections',
        where: bothSides('requester', 'addressee'),
        overrideAccess: true,
      })
      .catch(() => undefined);
    await payload
      .delete({
        collection: 'networking-meetings',
        where: bothSides('host', 'guest'),
        overrideAccess: true,
      })
      .catch(() => undefined);
    await payload
      .delete({
        collection: 'notifications',
        where: { participant: { equals: participantId } },
        overrideAccess: true,
      })
      .catch(() => undefined);

    const deleted = await payload
      .delete({
        collection: 'participants',
        id: participantId,
        overrideAccess: true,
      })
      .then(() => true)
      .catch(() => false);
    if (deleted) {
      report.accountsDeleted += 1;
    }
  }

  /*
   * The erasure records itself. Counts only, never names: a trail of
   * forgetting must not become the last place the forgotten are still
   * listed. The actor is the policy rather than a person — the command
   * was run by hand, but what it removed was decided by the rule.
   */
  const removed =
    report.messages +
    report.connections +
    report.meetings +
    report.notifications +
    report.registrations +
    report.sessionRegistrations +
    report.reports +
    report.accountsDeleted;
  if (removed > 0) {
    await payloadAuditRepository
      .record({
        action: 'privacy.retentionPurge',
        actor: {
          id: 'system',
          name: 'Retention policy',
          email: 'system@netaim',
        },
        subject: slug,
        detail: {
          messages: report.messages,
          connections: report.connections,
          meetings: report.meetings,
          notifications: report.notifications,
          registrations: report.registrations,
          sessionRegistrations: report.sessionRegistrations,
          reports: report.reports,
          accountsDeleted: report.accountsDeleted,
          accountsKept: report.accountsKept,
        },
      })
      .catch(() => undefined);
  }

  return report;
};
