import { describe, expect, it } from 'vitest';
import {
  CONFERENCE_SCENE_SEQUENCE,
  completeComposition,
  inspectJourney,
} from '@/features/cinematic';
import type { JourneyScene } from '@/features/cinematic';

/*
 * The journey's supporting intelligence (Experience Engine v2): an old
 * composition is completed with the scenes born after it was saved, and
 * the Rhythm Assistant offers quiet advice over the visible journey.
 */
const LEGACY_IDS = [
  'nav',
  'arrival',
  'story',
  'quote',
  'moments',
  'speakers',
  'program',
  'venue',
  'closing',
  'footer',
];

const journeyScene = (
  id: string,
  overrides?: Partial<JourneyScene>,
): JourneyScene => {
  const authored = CONFERENCE_SCENE_SEQUENCE.find((entry) => entry.id === id);
  return {
    id,
    type: authored?.type ?? id,
    hidden: authored?.hidden,
    ...overrides,
  };
};

const fullJourney = (): JourneyScene[] =>
  CONFERENCE_SCENE_SEQUENCE.map((entry) => journeyScene(entry.id));

describe('completeComposition', () => {
  it('leaves an empty composition empty', () => {
    expect(completeComposition([])).toEqual([]);
  });

  it('inserts newborn scenes at their authored slots, born hidden', () => {
    const legacy = LEGACY_IDS.map((scene) => ({ scene, hidden: false }));
    const completed = completeComposition(legacy);
    expect(completed.map((entry) => entry.scene)).toEqual(
      CONFERENCE_SCENE_SEQUENCE.map((entry) => entry.id),
    );
    const byScene = new Map(completed.map((entry) => [entry.scene, entry]));
    expect(byScene.get('countdown')?.hidden).toBe(true);
    expect(byScene.get('sponsors')?.hidden).toBe(false);
    expect(byScene.get('intro-join')?.hidden).toBe(true);
    expect(byScene.get('story')?.hidden).toBe(false);
  });

  it('keeps a reordered composition and anchors strangers to it', () => {
    const completed = completeComposition([
      { scene: 'speakers', hidden: false },
      { scene: 'arrival', hidden: false },
      { scene: 'closing', hidden: false },
    ]);
    const order = completed.map((entry) => entry.scene);
    expect(order.indexOf('speakers')).toBeLessThan(order.indexOf('arrival'));
    expect(order.indexOf('countdown')).toBe(order.indexOf('arrival') + 1);
    expect(order.indexOf('sponsors')).toBe(order.indexOf('speakers') + 1);
    expect(new Set(order).size).toBe(order.length);
    expect(order).toHaveLength(CONFERENCE_SCENE_SEQUENCE.length);
  });
});

describe('rhythm assistant', () => {
  it('stays silent over the authored journey', () => {
    expect(inspectJourney(fullJourney())).toEqual([]);
  });

  it('notices a journey without a door', () => {
    const journey = fullJourney().map((scene) =>
      scene.id === 'closing' ? { ...scene, hidden: true } : scene,
    );
    expect(inspectJourney(journey).map((note) => note.id)).toContain(
      'rhythm/no-door',
    );
  });

  it('notices a journey too short to tell a story', () => {
    const journey = [
      journeyScene('nav'),
      journeyScene('arrival'),
      journeyScene('story'),
      journeyScene('closing'),
      journeyScene('footer'),
    ];
    expect(inspectJourney(journey).map((note) => note.id)).toEqual([
      'rhythm/too-short',
    ]);
  });

  it('notices two media-heavy scenes back to back', () => {
    const between = ['featured-sessions', 'speakers', 'sponsors', 'program'];
    const journey = fullJourney().map((scene) =>
      between.includes(scene.id) ? { ...scene, hidden: true } : scene,
    );
    expect(inspectJourney(journey).map((note) => note.id)).toContain(
      'rhythm/media-run',
    );
  });

  it('notices a long journey without one quiet pause', () => {
    const journey = fullJourney().map((scene) =>
      scene.id === 'quote' ? { ...scene, hidden: true } : scene,
    );
    expect(inspectJourney(journey).map((note) => note.id)).toEqual([
      'rhythm/no-breath',
    ]);
  });
});
