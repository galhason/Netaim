import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { frontFirst, moveOnFront } from '@/features/speakers/utils/front-of-page';
import { frontPlace } from '@/infrastructure/payload/payload-speaker-roster';

/*
 * The speakers the page opens with.
 *
 * The organisers asked to choose the four or five speakers a conference's
 * speakers page leads with, and their order — in the Studio, on the
 * conference's speakers page — with everyone else following as before.
 * The choice reaches every reader of the roster: the platform's own
 * page and the marketing API the WordPress site renders.
 */
const read = (file: string): string => readFileSync(file, 'utf8');

describe('the front row comes first, everyone else as before', () => {
  const people = ['Avi', 'Bina', 'Chen', 'Dana', 'Eli'];
  const places: Record<string, number> = { Dana: 1, Bina: 2 };

  it('the chosen lead in their places, the rest keep their order', () => {
    expect(frontFirst(people, (name) => places[name])).toEqual(['Dana', 'Bina', 'Avi', 'Chen', 'Eli']);
  });

  it('nobody chosen leaves the page exactly as it was', () => {
    expect(frontFirst(people, () => undefined)).toEqual(people);
  });

  it('two at one place keep their own order, and a gap is no hole', () => {
    expect(frontFirst(people, (name) => ({ Eli: 3, Chen: 3, Avi: 7 })[name])).toEqual(['Chen', 'Eli', 'Avi', 'Bina', 'Dana']);
  });
});

describe('one press, one step', () => {
  const row = ['1', '2', '3'];

  it('up and down by one place', () => {
    expect(moveOnFront(row, '2', 'up')).toEqual(['2', '1', '3']);
    expect(moveOnFront(row, '2', 'down')).toEqual(['1', '3', '2']);
  });

  it('onto the row at the end, off it from anywhere', () => {
    expect(moveOnFront(row, '9', 'on')).toEqual(['1', '2', '3', '9']);
    expect(moveOnFront(row, '1', 'off')).toEqual(['2', '3']);
  });

  it('a step that cannot happen leaves the row as it is', () => {
    expect(moveOnFront(row, '1', 'up')).toEqual(row);
    expect(moveOnFront(row, '3', 'down')).toEqual(row);
    expect(moveOnFront(row, '2', 'on')).toEqual(row);
    expect(moveOnFront(row, '9', 'off')).toEqual(row);
  });
});

describe('a card knows its place, conference by conference', () => {
  const entries = [
    { conference: 4, position: 2 },
    { conference: { id: 7 }, position: '1' },
    { conference: null, position: 1 },
  ];

  it('reads the place for this conference only, at any depth', () => {
    expect(frontPlace(entries, '4')).toBe(2);
    expect(frontPlace(entries, 7)).toBe(1);
    expect(frontPlace(entries, '9')).toBeUndefined();
    expect(frontPlace(null, '4')).toBeUndefined();
  });
});

describe('every reader of the roster', () => {
  it('the platform reads it front row first', () => {
    const source = read('src/infrastructure/payload/payload-speaker.ts');
    expect(source).toContain('return frontFirst(speakers, (speaker) => speaker.presence.front);');
  });

  it('and so does the API the WordPress site renders in order', () => {
    const source = read('src/infrastructure/payload/payload-marketing.ts');
    expect(source).toContain('frontFirst(result.docs as unknown as SpeakerRow[], (row) => frontPlace(row.featuredOn, eventId))');
  });

  it('the place lives on the speaker card, never on the versioned conference', () => {
    expect(read('src/cms/collections/speakers.ts')).toContain("name: 'featuredOn'");
    expect(read('src/cms/collections/events.ts')).not.toContain('featuredOn');
    const migration = read('src/migrations/20261023_090000_speakers_in_front.ts');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "speakers_featured_on"');
    expect(migration).not.toMatch(/UPDATE "|DELETE FROM|ALTER TABLE "(speakers|events|participants)"/);
    expect(read('src/migrations/index.ts').trimEnd()).toMatch(/name: '20261023_090000_speakers_in_front',\s*\},\s*\];$/);
  });
});

describe('the Studio', () => {
  const page = read('src/app/(studio)/studio/(console)/conference/[slug]/speakers/page.tsx');
  const actions = read('src/app/(studio)/studio/(console)/conference/[slug]/speakers/actions.ts');

  it('sets the front row on the conference speakers page, behind the conference permission', () => {
    expect(page).toContain('<section id="front-row"');
    expect(page).toContain('value={`${speaker.id}:up`}');
    expect(page).toContain('<input type="hidden" name="move" value={`${speaker.id}:on`} />');
    expect(page).toContain('form={`pin-${speaker.id}`}');
    expect(actions).toMatch(/export const moveFrontSpeakerAction[\s\S]*?actorFor\('events:manage', slug\)/);
  });

  it('a speaker taken off the conference leaves the front row with it', () => {
    expect(actions).toMatch(/if \(!stillOn\) \{\s*await moveSpeakerOnFront\(slug, id, 'off'\);/);
  });

  it('no pin rides the card form as a server-action button, which would lose its name', () => {
    expect(page).not.toMatch(/formAction=\{moveFrontSpeakerAction\}/);
  });

  it('Enter in a card still saves it', () => {
    const card = page.slice(page.indexOf('<div className="ms-auto flex flex-wrap items-center gap-2">'));
    expect(card.indexOf('{UI.save[locale]}')).toBeLessThan(card.indexOf('{UI.frontPin[locale]}'));
  });
});
