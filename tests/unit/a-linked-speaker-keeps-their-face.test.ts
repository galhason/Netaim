import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
 * A speaker who is also a participant lends their account's photo. The
 * programme reads sessions at depth two — session, speaker, account —
 * and the account's photo sits one hop beyond, as a bare id, so the
 * identity rule saw no picture and the tile drew initials beside a name
 * whose owner had uploaded a face. The repository now fetches those
 * photos once per list and puts them back before resolving.
 */
describe('a linked speaker keeps their face on the programme', () => {
  const source = readFileSync('src/infrastructure/payload/payload-session.ts', 'utf8');

  it('fetches the account photos the depth left behind, once for the whole list', () => {
    expect(source).toContain("collection: 'media'");
    expect(source).toContain('where: { id: { in: ids } }');
    expect(source).toContain('withAccountPhotos(payload, result.docs as unknown as SessionRow[])');
    /* The single activity read the same way, so the drawer agrees with the tile. */
    expect(source).toContain('withAccountPhotos(payload, [doc as unknown as SessionRow])');
  });

  it('gives the face room on the tile and in the drawer', () => {
    const tile = readFileSync('src/features/conference/components/activity-tile.tsx', 'utf8');
    expect(tile).toContain('size={48}');
    expect(tile).toContain('size-[76px]');
    expect(readFileSync('src/features/conference/components/speaker-card.tsx', 'utf8')).toContain('size={64}');
  });
});

describe('an activity given by more than one speaker', () => {
  it('shows every face on the tile, not only the first', () => {
    const tile = readFileSync('src/features/conference/components/activity-tile.tsx', 'utf8');
    expect(tile).toContain('<AvatarGroup speakers={activity.speakers} size={48} max={3} />');
    expect(tile).not.toContain('activity.speakers[0]');
  });
});
