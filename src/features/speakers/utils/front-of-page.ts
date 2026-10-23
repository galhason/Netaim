/*
 * The front of a conference's speakers page.
 *
 * The organisers choose a few speakers to lead the page, each with a
 * place (1 is first). Those come first, by place; everyone else follows
 * in the order they already had. Two at one place keep their own order
 * between them, so a stray duplicate never shuffles the page.
 */
export const frontFirst = <T>(items: readonly T[], placeOf: (item: T) => number | undefined): T[] => {
  const ranked = items.map((item, index) => ({ item, index, place: placeOf(item) }));
  const front = ranked
    .filter((entry): entry is typeof entry & { place: number } => entry.place !== undefined)
    .sort((a, b) => a.place - b.place || a.index - b.index);
  const rest = ranked.filter((entry) => entry.place === undefined);
  return [...front, ...rest].map((entry) => entry.item);
};

export type FrontMove = 'up' | 'down' | 'off' | 'on';

/*
 * One step on the front row, as ids in order: up or down by one place,
 * off the row, or onto it at the end. A move that cannot happen (the
 * first one up, someone not on the row taken off) leaves the row as it is.
 */
export const moveOnFront = (row: readonly string[], id: string, move: FrontMove): string[] => {
  const at = row.indexOf(id);
  if (move === 'on') {
    return at === -1 ? [...row, id] : [...row];
  }
  if (at === -1) {
    return [...row];
  }
  if (move === 'off') {
    return row.filter((item) => item !== id);
  }
  const to = move === 'up' ? at - 1 : at + 1;
  if (to < 0 || to >= row.length) {
    return [...row];
  }
  const next = [...row];
  [next[at], next[to]] = [next[to]!, next[at]!];
  return next;
};
