import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createSceneRegistry } from '@/experience-engine/registry/scene-registry';
import { resolveScenes } from '@/experience-engine/resolver/scene-resolver';
import type {
  SceneComponent,
  SceneData,
} from '@/experience-engine/types/scene';

const component: SceneComponent = () => null;

const registryWithHero = () => {
  const registry = createSceneRegistry();
  registry.register({
    type: 'hero',
    contentSchema: z.object({ headline: z.string() }),
    load: () => Promise.resolve({ default: component }),
  });
  return registry;
};

const scene = (overrides: Partial<SceneData>): SceneData => ({
  id: 's1',
  type: 'hero',
  title: 'Scene',
  enabled: true,
  content: { headline: 'h' },
  ...overrides,
});

describe('experience resolution', () => {
  it('resolves valid scenes with parsed content', () => {
    const result = resolveScenes([scene({})], registryWithHero());
    expect(result.scenes).toHaveLength(1);
    expect(result.failures).toHaveLength(0);
    expect(result.scenes[0]?.content).toEqual({ headline: 'h' });
  });

  it('collects unknown scene types without throwing', () => {
    const result = resolveScenes(
      [scene({ id: 'x', type: 'spotlight' })],
      registryWithHero(),
    );
    expect(result.scenes).toHaveLength(0);
    expect(result.failures[0]?.reason).toBe('unknown-type');
  });

  it('collects invalid content with issues', () => {
    const result = resolveScenes(
      [scene({ content: {} })],
      registryWithHero(),
    );
    expect(result.failures[0]?.reason).toBe('invalid-content');
    expect(result.failures[0]?.issues.length).toBeGreaterThan(0);
  });

  it('skips disabled scenes silently', () => {
    const result = resolveScenes(
      [scene({ enabled: false })],
      registryWithHero(),
    );
    expect(result.scenes).toHaveLength(0);
    expect(result.failures).toHaveLength(0);
  });

  it('rejects duplicate scene type registration', () => {
    const registry = registryWithHero();
    expect(() =>
      registry.register({
        type: 'hero',
        contentSchema: z.object({}),
        load: () => Promise.resolve({ default: component }),
      }),
    ).toThrow();
  });
});
