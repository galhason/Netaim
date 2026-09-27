import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * The partners strip is an ordered list: a new partner joins at the
 * end, a move renumbers the whole list so gaps and ties from an older
 * hand-kept list cannot swallow it, and a move off either end changes
 * nothing.
 */
interface Row {
  id: string;
  slug: string;
  name: string;
  order: number;
  tier: 'partner';
}

const state = { rows: [] as Row[] };

vi.mock('@/infrastructure', () => ({
  sponsorRepository: {
    listByEvent: async (slug: string) =>
      state.rows
        .filter((row) => row.slug === slug)
        .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
        .map((row) => ({ ...row })),
    create: async (slug: string, input: { name: string; order?: number; tier: 'partner' }) => {
      const row: Row = { id: `p${state.rows.length + 1}`, slug, name: input.name, order: input.order ?? 0, tier: 'partner' };
      state.rows.push(row);
      return { ...row };
    },
    update: async (id: string, input: { order?: number; name?: string }) => {
      const row = state.rows.find((entry) => entry.id === id);
      if (!row) return null;
      if (input.order !== undefined) row.order = input.order;
      if (input.name !== undefined) row.name = input.name;
      return { ...row };
    },
    remove: async (id: string) => {
      const before = state.rows.length;
      state.rows = state.rows.filter((row) => row.id !== id);
      return state.rows.length < before;
    },
  },
}));

const load = () => import('@/features/sponsors/services/sponsor-service');
const names = async (slug: string) => (await (await load()).listSponsors(slug)).map((s) => s.name);

describe('the partners strip', () => {
  beforeEach(() => {
    /* Gaps and a tie, as a list edited by hand over a year looks. */
    state.rows = [
      { id: 'p1', slug: 'brkt', name: 'Keren', order: 0, tier: 'partner' },
      { id: 'p2', slug: 'brkt', name: 'Tamar', order: 5, tier: 'partner' },
      { id: 'p3', slug: 'brkt', name: 'Ofek', order: 5, tier: 'partner' },
      { id: 'p4', slug: 'other', name: 'Elsewhere', order: 0, tier: 'partner' },
    ];
  });

  it('adds a partner at the end of the strip', async () => {
    const service = await load();
    const added = await service.addSponsor('brkt', { name: 'Galil', tier: 'partner' });
    expect(added.order).toBe(6);
    expect(await names('brkt')).toEqual(['Keren', 'Ofek', 'Tamar', 'Galil']);
  });

  it('moves a partner one step and renumbers the list without gaps', async () => {
    const service = await load();
    const after = await service.moveSponsor('brkt', 'p2', 'up');
    expect(after.map((s) => s.name)).toEqual(['Keren', 'Tamar', 'Ofek']);
    expect(after.map((s) => s.order)).toEqual([0, 1, 2]);
    expect(await names('brkt')).toEqual(['Keren', 'Tamar', 'Ofek']);
    expect(state.rows.find((row) => row.id === 'p4')?.order).toBe(0);
  });

  it('leaves the list alone when the move goes off the end', async () => {
    const service = await load();
    await service.moveSponsor('brkt', 'p1', 'up');
    await service.moveSponsor('brkt', 'missing', 'down');
    expect(await names('brkt')).toEqual(['Keren', 'Ofek', 'Tamar']);
  });

  it('removes a partner and closes the gap on the next move', async () => {
    const service = await load();
    expect(await service.removeSponsor('p3')).toBe(true);
    await service.moveSponsor('brkt', 'p2', 'up');
    expect(await names('brkt')).toEqual(['Tamar', 'Keren']);
  });
});
