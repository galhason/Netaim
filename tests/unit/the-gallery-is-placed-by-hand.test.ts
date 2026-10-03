import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * Every place on the gallery page is chosen by hand, and the service
 * keeps the two rules that make that safe: the hero takes a photograph
 * and the film band a film — never the other way round — and each holds
 * one item, so choosing a new one sends the old one back to the main
 * grid. Items moved into a grid join its end, and moving an item earlier
 * or later steps past its neighbour in the same grid, never into another.
 */
interface Row {
  id: string;
  kind: 'image' | 'video';
  placement: 'hero' | 'story' | 'film' | 'more';
  order: number;
}

const state = { rows: [] as Row[] };

vi.mock('@/infrastructure', () => ({
  galleryRepository: {
    listByEvent: async () => [...state.rows].sort((a, b) => a.order - b.order).map((row) => ({ ...row })),
    update: async (id: string, input: Partial<Row>) => {
      const row = state.rows.find((entry) => entry.id === id);
      if (!row) return null;
      Object.assign(row, input);
      return { ...row };
    },
    create: async (_slug: string, input: Partial<Row> & { mediaId: string }) => {
      const row: Row = { id: `n${input.mediaId}`, kind: 'image', placement: input.placement ?? 'story', order: input.order ?? 0 };
      state.rows.push(row);
      return { ...row };
    },
  },
}));

const { addGalleryItems, moveGalleryItem, placeGalleryItem } = await import('@/features/gallery/services/gallery-service');

const where = () => Object.fromEntries(state.rows.map((row) => [row.id, row.placement]));
const grid = (placement: Row['placement']) =>
  state.rows.filter((row) => row.placement === placement).sort((a, b) => a.order - b.order).map((row) => row.id);

beforeEach(() => {
  state.rows = [
    { id: 'p1', kind: 'image', placement: 'hero', order: 0 },
    { id: 'p2', kind: 'image', placement: 'story', order: 1 },
    { id: 'v3', kind: 'video', placement: 'film', order: 2 },
    { id: 'p4', kind: 'image', placement: 'more', order: 3 },
    { id: 'p5', kind: 'image', placement: 'story', order: 4 },
    { id: 'v6', kind: 'video', placement: 'story', order: 5 },
  ];
});

describe('the hero and the film', () => {
  it('takes a new hero and sends the old one back to the main grid', async () => {
    expect(await placeGalleryItem('summit', 'p5', 'hero')).toEqual({ ok: true });
    expect(where()).toMatchObject({ p5: 'hero', p1: 'story' });
    expect(state.rows.filter((row) => row.placement === 'hero')).toHaveLength(1);
  });

  it('takes a new film and sends the old one back to the main grid', async () => {
    expect(await placeGalleryItem('summit', 'v6', 'film')).toEqual({ ok: true });
    expect(where()).toMatchObject({ v6: 'film', v3: 'story' });
  });

  it('refuses a film as the hero and a photograph as the film', async () => {
    expect(await placeGalleryItem('summit', 'v6', 'hero')).toEqual({ ok: false, reason: 'kind' });
    expect(await placeGalleryItem('summit', 'p2', 'film')).toEqual({ ok: false, reason: 'kind' });
    expect(where()).toMatchObject({ p1: 'hero', v3: 'film', v6: 'story', p2: 'story' });
  });

  it('refuses an item it does not know', async () => {
    expect(await placeGalleryItem('summit', 'nope', 'story')).toEqual({ ok: false, reason: 'missing' });
  });
});

describe('the grids', () => {
  it('puts an item moved into a grid at its end', async () => {
    await placeGalleryItem('summit', 'p2', 'more');
    expect(grid('more')).toEqual(['p4', 'p2']);
  });

  it('adds several uploads together, in the order chosen, at the end of one grid', async () => {
    await addGalleryItems('summit', ['10', '11'], 'more');
    expect(grid('more')).toEqual(['p4', 'n10', 'n11']);
  });

  it('moves an item past its neighbour in the same grid, skipping the others', async () => {
    await moveGalleryItem('summit', 'p5', 'up');
    expect(grid('story')).toEqual(['p5', 'p2', 'v6']);
    expect(grid('more')).toEqual(['p4']);
    expect(where()).toMatchObject({ p1: 'hero', v3: 'film' });
  });

  it('does nothing when there is no neighbour in that grid', async () => {
    await moveGalleryItem('summit', 'p4', 'up');
    await moveGalleryItem('summit', 'p4', 'down');
    expect(grid('more')).toEqual(['p4']);
  });
});
