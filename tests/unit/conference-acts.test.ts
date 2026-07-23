import { describe, expect, it } from 'vitest';
import {
  CONFERENCE_ACTS,
  CONFERENCE_SCENE_SEQUENCE,
  actBlocks,
  actOfScene,
  moveAct,
  moveSceneWithinAct,
  setActHidden,
} from '@/features/cinematic';
import type { ActScene } from '@/features/cinematic';

/*
 * The Act model (Experience Engine v2): organizational containers over
 * the flat composition — grouping, block moves, act-wide visibility,
 * and in-act scene moves. The Runtime never sees an Act.
 */
const journey = (): ActScene[] =>
  CONFERENCE_SCENE_SEQUENCE.map((entry) => ({
    id: entry.id,
    hidden: entry.hidden,
  }));

const ids = (scenes: { id: string }[]) => scenes.map((scene) => scene.id);

describe('conference acts', () => {
  it('covers every journey scene once and no chrome', () => {
    const covered = CONFERENCE_ACTS.flatMap((act) => act.scenes);
    expect(new Set(covered).size).toBe(covered.length);
    expect(actOfScene('nav')).toBeNull();
    expect(actOfScene('footer')).toBeNull();
    for (const entry of CONFERENCE_SCENE_SEQUENCE) {
      if (entry.id !== 'nav' && entry.id !== 'footer') {
        expect(actOfScene(entry.id)).not.toBeNull();
      }
    }
  });

  it('groups the authored journey into the five acts in order', () => {
    const blocks = actBlocks(journey());
    expect(blocks.map((block) => block.id)).toEqual([
      'invitation',
      'story',
      'people',
      'experience',
      'join',
    ]);
    expect(ids(blocks[0]?.scenes ?? [])).toEqual([
      'arrival',
      'countdown',
      'facts',
    ]);
    expect(ids(blocks[1]?.scenes ?? [])).toEqual([
      'intro-story',
      'story',
      'quote',
      'moments',
      'featured-sessions',
    ]);
    expect(blocks.every((block) => !block.hidden)).toBe(true);
  });

  it('regroups scattered members under their act at first appearance', () => {
    const scattered = [
      { id: 'nav' },
      { id: 'quote' },
      { id: 'speakers' },
      { id: 'story' },
      { id: 'footer' },
    ];
    const blocks = actBlocks(scattered);
    expect(blocks.map((block) => block.id)).toEqual(['story', 'people']);
    expect(ids(blocks[0]?.scenes ?? [])).toEqual(['quote', 'story']);
  });

  it('moves an act as one block and keeps chrome at the edges', () => {
    const next = moveAct(journey(), 'people', -1);
    expect(next).not.toBeNull();
    expect(ids(next ?? [])).toEqual([
      'nav',
      'arrival',
      'countdown',
      'facts',
      'intro-people',
      'speakers',
      'sponsors',
      'intro-story',
      'story',
      'quote',
      'moments',
      'featured-sessions',
      'intro-experience',
      'program',
      'venue',
      'intro-join',
      'closing',
      'footer',
    ]);
  });

  it('refuses an impossible or unknown act move', () => {
    expect(moveAct(journey(), 'invitation', -1)).toBeNull();
    expect(moveAct(journey(), 'join', 1)).toBeNull();
    expect(moveAct(journey(), 'finale', 1)).toBeNull();
  });

  it('hides and reveals every scene of an act', () => {
    const hidden = setActHidden(journey(), 'story', true);
    expect(hidden).not.toBeNull();
    const blocks = actBlocks(hidden ?? []);
    expect(blocks.find((block) => block.id === 'story')?.hidden).toBe(true);
    expect(blocks.find((block) => block.id === 'people')?.hidden).toBe(false);
    const revealed = setActHidden(hidden ?? [], 'story', false);
    const storyAct = CONFERENCE_ACTS.find((act) => act.id === 'story');
    for (const sceneId of storyAct?.scenes ?? []) {
      expect(
        (revealed ?? []).find((scene) => scene.id === sceneId)?.hidden,
      ).toBeUndefined();
    }
    expect(
      (revealed ?? []).find((scene) => scene.id === 'intro-people')?.hidden,
    ).toBe(true);
    expect(setActHidden(journey(), 'finale', true)).toBeNull();
  });

  it('moves a scene inside its act and refuses the border', () => {
    const next = moveSceneWithinAct(journey(), 'quote', -1);
    const story = actBlocks(next ?? []).find((block) => block.id === 'story');
    expect(ids(story?.scenes ?? [])).toEqual([
      'intro-story',
      'quote',
      'story',
      'moments',
      'featured-sessions',
    ]);
    expect(moveSceneWithinAct(journey(), 'arrival', -1)).toBeNull();
    expect(moveSceneWithinAct(journey(), 'featured-sessions', 1)).toBeNull();
    expect(moveSceneWithinAct(journey(), 'nav', 1)).toBeNull();
  });
});
