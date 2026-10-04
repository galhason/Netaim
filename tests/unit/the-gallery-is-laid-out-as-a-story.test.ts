import { describe, expect, it } from 'vitest';
import { editorialLayout, type TileShape } from '@/features/gallery/utils/editorial-layout';

/*
 * The editorial grid above the film: a lead picture and supporting ones
 * at different sizes, never a wall of equal cards — and whatever the
 * count, the shapes close into full rows, so the grid never ends on a
 * hole. Packed here the way the browser packs them, row by row.
 */
const size = (shape: TileShape) => shape.split('x').map(Number) as [number, number];

/* CSS grid's own placement, in a grid this many columns wide. */
const pack = (shapes: TileShape[], columns: number) => {
  const filled: boolean[][] = [];
  const cell = (row: number, column: number) => filled[row]?.[column] ?? false;
  let row = 0;
  let column = 0;
  for (const shape of shapes) {
    const [width, height] = size(shape);
    for (;;) {
      if (column + width > columns) {
        row += 1;
        column = 0;
        continue;
      }
      let free = true;
      for (let r = row; r < row + height && free; r += 1) {
        for (let c = column; c < column + width && free; c += 1) {
          free = !cell(r, c);
        }
      }
      if (free) {
        break;
      }
      column += 1;
    }
    for (let r = row; r < row + height; r += 1) {
      filled[r] ??= [];
      for (let c = column; c < column + width; c += 1) {
        (filled[r] as boolean[])[c] = true;
      }
    }
    column += width;
  }
  return filled;
};

const holes = (filled: boolean[][], columns: number) =>
  filled.reduce((count, row) => count + Array.from({ length: columns }, (_, c) => c).filter((c) => !row[c]).length, 0);

describe('the editorial grid', () => {
  it('gives every picture a shape, on a laptop and on a phone', () => {
    for (let count = 0; count <= 40; count += 1) {
      expect(editorialLayout(count)).toHaveLength(count);
    }
  });

  it('closes into full rows on a laptop, whatever the count', () => {
    for (let count = 1; count <= 40; count += 1) {
      const filled = pack(editorialLayout(count).map((tile) => tile.desk), 12);
      expect(holes(filled, 12), `${count} pictures`).toBe(0);
    }
  });

  it('closes into full rows on a phone, whatever the count', () => {
    for (let count = 1; count <= 40; count += 1) {
      const filled = pack(editorialLayout(count).map((tile) => tile.phone), 2);
      expect(holes(filled, 2), `${count} pictures`).toBe(0);
    }
  });

  it('leads with a large picture and mixes sizes, rather than equal cards', () => {
    const layout = editorialLayout(9);
    expect(layout[0]).toEqual({ desk: '4x4', phone: '2x2' });
    expect(new Set(layout.map((tile) => tile.desk)).size).toBeGreaterThan(3);
  });

  it('crosses the lead to the other side on the next run', () => {
    const layout = editorialLayout(18);
    expect(layout[0]?.desk).toBe('4x4');
    expect(layout[9]?.desk).not.toBe('4x4');
    expect(layout.slice(9, 12).map((tile) => tile.desk)).toContain('4x4');
  });
});
