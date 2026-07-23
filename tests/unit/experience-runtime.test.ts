import { describe, expect, it } from 'vitest';
import { canTransition, nextStages } from '@/experience-runtime/model/lifecycle';
import {
  registerExperienceType,
  experienceHasCapability,
} from '@/experience-runtime/registry/experience-types';
import {
  registerScene,
  resolveScene,
} from '@/experience-runtime/registry/scene-registry';

describe('scene registry', () => {
  it('resolves a registered scene by type', () => {
    registerScene({
      type: 'test-scene',
      version: 1,
      renderer: () => null,
      defaultContent: { title: '' },
    });
    expect(resolveScene('test-scene')?.version).toBe(1);
  });

  it('returns undefined for an unknown scene', () => {
    expect(resolveScene('missing-scene')).toBeUndefined();
  });
});

describe('experience lifecycle', () => {
  it('allows the forward path of an experience life', () => {
    expect(canTransition('draft', 'planning')).toBe(true);
    expect(canTransition('scheduled', 'live')).toBe(true);
    expect(canTransition('live', 'inProgress')).toBe(true);
    expect(canTransition('completed', 'archive')).toBe(true);
  });

  it('rejects illegal jumps', () => {
    expect(canTransition('draft', 'live')).toBe(false);
    expect(canTransition('archive', 'draft')).toBe(false);
    expect(nextStages('archive')).toEqual([]);
  });
});

describe('experience capabilities', () => {
  it('answers capability questions through the type registry', () => {
    registerExperienceType({
      id: 'test-webinar',
      capabilities: ['liveStream', 'story'],
    });
    expect(experienceHasCapability('test-webinar', 'liveStream')).toBe(true);
    expect(experienceHasCapability('test-webinar', 'venue')).toBe(false);
    expect(experienceHasCapability('unknown-type', 'hero')).toBe(false);
  });
});
