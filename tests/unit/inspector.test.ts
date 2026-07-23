import { describe, expect, it } from 'vitest';
import { inspectExperience } from '@/experience-engine/inspector/experience-inspector';
import type { SceneData } from '@/experience-engine/types/scene';

const scene = (
  type: string,
  content: unknown = {},
  enabled = true,
): SceneData => ({
  id: `${type}-${Math.random().toString(36).slice(2, 8)}`,
  type,
  title: type,
  enabled,
  content,
});

const healthyJourney = (): SceneData[] => [
  scene('hero', {
    headline: 'h',
    subheadline: 's',
    backgroundImage: { url: '/x.jpg' },
  }),
  scene('story', { paragraphs: ['short one.', 'short two.'] }),
  scene('agenda', {}),
  scene('speaker-grid', {}),
  scene('venue', {}),
  scene('faq', {}),
  scene('registration-cta', { label: 'join', href: '#j' }),
];

const findingIds = (scenes: SceneData[]) =>
  inspectExperience(scenes).map((finding) => finding.id);

describe('experience inspector', () => {
  it('finds nothing wrong with a healthy journey', () => {
    expect(inspectExperience(healthyJourney())).toEqual([]);
  });

  it('advises against consecutive media-heavy scenes', () => {
    const scenes = [scene('hero', { headline: 'h', subheadline: 's' }), scene('venue', {})];
    expect(findingIds(scenes)).toContain('inspector/consecutive-media');
  });

  it('warns when the hero has no emotional anchor', () => {
    const scenes = healthyJourney();
    scenes[0] = scene('hero', { headline: 'only a headline' });
    expect(findingIds(scenes)).toContain('inspector/hero-anchor-missing');
  });

  it('advises when the purpose chapter runs too long', () => {
    const scenes = healthyJourney();
    scenes[1] = scene('story', { paragraphs: ['x'.repeat(700)] });
    expect(findingIds(scenes)).toContain('inspector/purpose-too-long');
  });

  it('warns when the journey has no join chapter', () => {
    const scenes = healthyJourney().filter(
      (s) => s.type !== 'registration-cta',
    );
    expect(findingIds(scenes)).toContain('inspector/join-missing');
  });

  it('advises when join does not close the journey', () => {
    const scenes = healthyJourney();
    const join = scenes.pop();
    scenes.splice(2, 0, join as SceneData);
    expect(findingIds(scenes)).toContain('inspector/join-not-last');
  });

  it('advises on repeated consecutive scene types', () => {
    const scenes = healthyJourney();
    scenes.splice(2, 0, scene('story', { paragraphs: ['again.'] }));
    expect(findingIds(scenes)).toContain('inspector/repeated-scene-type');
  });

  it('ignores disabled scenes entirely', () => {
    const scenes = [
      scene('hero', { headline: 'h', subheadline: 's' }),
      scene('venue', {}, false),
      scene('registration-cta', { label: 'j', href: '#' }),
    ];
    expect(findingIds(scenes)).not.toContain('inspector/consecutive-media');
  });
});
