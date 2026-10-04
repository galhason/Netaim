/*
 * The editorial grid's shapes: for each picture, how many columns and
 * rows it takes — on a laptop in a twelve-column grid, on a phone in a
 * two-column one. Read as a photo story, not a catalogue: one picture
 * leads each run, the others support it at different sizes, and the
 * shapes always close into full rows, so a gallery of any length ends
 * on a clean edge rather than a hole.
 *
 * A run on a laptop holds nine pictures — a large lead, a wide one, and
 * smaller ones beside and below — and the next run mirrors it, the lead
 * crossing to the other side. What is left after the last full run gets
 * a shape made for that count. On a phone a full-width picture opens
 * each group of six, a tall one and four small ones follow, and the
 * last picture stretches to close the group when the count runs out.
 */
export type TileShape = `${number}x${number}`;

export interface TileLayout {
  desk: TileShape;
  phone: TileShape;
}

const RUN: TileShape[] = ['4x4', '5x2', '3x2', '3x2', '2x2', '3x2', '3x2', '4x2', '5x2'];
const RUN_MIRRORED: TileShape[] = ['5x2', '3x2', '4x4', '3x2', '2x2', '3x2', '5x2', '4x2', '3x2'];

/* What is left after the last full run, by how many pictures it holds. */
const TAIL: Record<number, TileShape[]> = {
  1: ['12x4'],
  2: ['7x4', '5x4'],
  3: ['6x4', '6x2', '6x2'],
  4: ['4x4', '4x2', '4x2', '8x2'],
  5: ['4x4', '5x2', '3x2', '3x2', '5x2'],
  6: ['4x4', '5x2', '3x2', '3x2', '2x2', '3x2'],
  7: ['4x4', '4x2', '4x2', '8x2', '6x2', '3x2', '3x2'],
  8: ['4x4', '5x2', '3x2', '3x2', '2x2', '3x2', '6x2', '6x2'],
};

const PHONE_GROUP: TileShape[] = ['2x2', '1x2', '1x1', '1x1', '1x1', '1x1'];

const deskShapes = (count: number): TileShape[] => {
  const shapes: TileShape[] = [];
  let run = 0;
  while (count - shapes.length >= RUN.length) {
    shapes.push(...(run % 2 === 0 ? RUN : RUN_MIRRORED));
    run += 1;
  }
  const rest = count - shapes.length;
  return rest > 0 ? [...shapes, ...(TAIL[rest] ?? [])] : shapes;
};

/*
 * The last group on a phone, closed: a tall picture left alone becomes
 * full-width; a small one with an empty cell beside or below it grows
 * to fill it.
 */
const phoneShapes = (count: number): TileShape[] => {
  const shapes = Array.from({ length: count }, (_, index) => PHONE_GROUP[index % PHONE_GROUP.length] as TileShape);
  const last = count - 1;
  const position = last % PHONE_GROUP.length;
  if (count > 0) {
    if (position === 1) {
      shapes[last] = '2x2';
    } else if (position === 2) {
      shapes[last] = '1x2';
    } else if (position === 4) {
      shapes[last] = '2x2';
    }
  }
  return shapes;
};

export const editorialLayout = (count: number): TileLayout[] => {
  const desk = deskShapes(count);
  const phone = phoneShapes(count);
  return desk.map((shape, index) => ({ desk: shape, phone: phone[index] as TileShape }));
};

/* The share of the grid's width a shape takes, for the image's sizes. */
export const columnsOf = (shape: TileShape): number => Number(shape.split('x')[0]);
