import { describe, expect, it } from 'vitest';
import { applyComposition } from '@/experience-runtime/model/composition';
import type { SceneInstance } from '@/experience-runtime';

/*
 * The Composer's contract: composition is data applied over the
 * authored scene list — and an empty composition changes nothing, so
 * every experience without direction renders exactly as before.
 */
const scenes: SceneInstance[] = [
  { id: 'nav', type: 'opening-nav', content: {} },
  { id: 'hero', type: 'opening-hero', content: {} },
  { id: 'story', type: 'opening-story', content: {} },
  { id: 'footer', type: 'opening-footer', content: {} },
];

describe('applyComposition', () => {
  it('leaves the authored order untouched when empty', () => {
    expect(applyComposition(scenes, [])).toBe(scenes);
  });

  it('reorders mentioned scenes and appends the rest', () => {
    const result = applyComposition(scenes, [
      { scene: 'story' },
      { scene: 'hero' },
    ]);
    expect(result.map((scene) => scene.id)).toEqual([
      'story',
      'hero',
      'nav',
      'footer',
    ]);
  });

  it('applies and clears visibility from the composition', () => {
    const hiddenResult = applyComposition(scenes, [
      { scene: 'hero', hidden: true },
    ]);
    expect(hiddenResult[0]?.hidden).toBe(true);
    const shownAgain = applyComposition(hiddenResult, [
      { scene: 'hero', hidden: false },
    ]);
    expect(shownAgain[0]?.hidden).toBeUndefined();
  });

  it('carries and clears a presentation variant', () => {
    const withVariant = applyComposition(scenes, [
      { scene: 'story', variant: 'mirrored' },
    ]);
    expect(withVariant[0]?.variant).toBe('mirrored');
    const cleared = applyComposition(withVariant, [{ scene: 'story' }]);
    expect(cleared[0]?.variant).toBeUndefined();
    const emptyString = applyComposition(scenes, [
      { scene: 'story', variant: '' },
    ]);
    expect(emptyString[0]?.variant).toBeUndefined();
  });

  it('ignores unknown and duplicate entries', () => {
    const result = applyComposition(scenes, [
      { scene: 'ghost' },
      { scene: 'hero' },
      { scene: 'hero', hidden: true },
    ]);
    expect(result.map((scene) => scene.id)).toEqual([
      'hero',
      'nav',
      'story',
      'footer',
    ]);
    expect(result[0]?.hidden).toBeUndefined();
  });
});
