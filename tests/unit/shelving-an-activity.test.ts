import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * An archived activity is off the program for everyone and back on it
 * with one restore; the people in it are told, as for a cancellation;
 * and a stale link to it registers no one.
 */
const state = {
  rows: [] as { id: string; eventSlug: string; title: string; archivedAt?: string; startsAt?: string; endsAt?: string }[],
  cancelled: [] as string[],
};

vi.mock('@/infrastructure', () => ({
  sessionRepository: {
    listByEvent: async (slug: string, _locale: string, options?: { includeArchived?: boolean }) =>
      state.rows.filter((row) => row.eventSlug === slug && (options?.includeArchived || !row.archivedAt)),
    getById: async (id: string) => state.rows.find((row) => row.id === id) ?? null,
    setArchived: async (id: string, archived: boolean) => {
      const row = state.rows.find((entry) => entry.id === id);
      if (!row) return false;
      if (archived) row.archivedAt = '2026-09-26T12:00:00.000Z';
      else delete row.archivedAt;
      return true;
    },
    countsBySession: async () => ({ confirmed: 0, pending: 0, waitlisted: 0 }),
    remove: async () => true,
  },
  sessionRegistrationRepository: {
    find: async () => null,
    listForParticipant: async () => [],
  },
  notificationOutbox: { enqueue: async () => undefined },
}));
vi.mock('@/features/program/services/session-change-notices', () => ({
  announceSessionCancelled: async (_slug: string, id: string) => {
    state.cancelled.push(id);
  },
  announceSessionChange: async () => undefined,
}));
vi.mock('@/features/registration', () => ({
  currentParticipant: async () => ({ id: 'p1', name: 'x', email: 'x@example.org' }),
}));

const load = () => import('@/features/program/services/program-service');

describe('shelving an activity', () => {
  beforeEach(() => {
    state.rows = [
      { id: 's1', eventSlug: 'brkt', title: 'Keynote', startsAt: '2026-07-24T07:00:00Z', endsAt: '2026-07-24T08:00:00Z' },
      { id: 's2', eventSlug: 'brkt', title: 'Workshop' },
    ];
    state.cancelled = [];
  });

  it('takes it off the agenda, keeps it on the shelf, and tells the people in it', async () => {
    const program = await load();
    expect(await program.archiveSession('s1')).toBe(true);
    expect(state.cancelled).toEqual(['s1']);
    expect((await program.listAgenda('brkt', 'he')).map((s) => s.id)).toEqual(['s2']);
    expect((await program.listArchivedActivities('brkt', 'he')).map((s) => s.id)).toEqual(['s1']);
  });

  it('comes back whole on restore', async () => {
    const program = await load();
    await program.archiveSession('s1');
    expect(await program.restoreSession('s1')).toBe(true);
    expect((await program.listAgenda('brkt', 'he')).map((s) => s.id)).toEqual(['s1', 's2']);
    expect(await program.listArchivedActivities('brkt', 'he')).toEqual([]);
  });

  it('registers no one while shelved', async () => {
    const program = await load();
    await program.archiveSession('s1');
    await expect(program.selectWorkshop('s1', 'he')).rejects.toThrow('Session not found');
  });
});
