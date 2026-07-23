import { describe, expect, it } from 'vitest';
import type { SceneData } from '@/experience-engine/types/scene';
import { composerReducer } from '@/features/composer/state/composer-reducer';
import type { ComposerState } from '@/features/composer/types/composer';
import { getAtPath, setAtPath } from '@/features/composer/utils/content-path';

const scene = (id: string, content: unknown = {}): SceneData => ({
  id,
  type: 'hero',
  title: id,
  enabled: true,
  content,
});

const state = (): ComposerState => ({
  scenesByLocale: {
    he: [scene('a', { headline: 'שלום' }), scene('b'), scene('c')],
    en: [scene('a', { headline: 'hello' }), scene('b'), scene('c')],
  },
  locale: 'he',
  device: 'desktop',
  selectedSceneId: null,
  identity: {
    photographyStyle: 'dusk',
    atmosphere: 'ceremonial',
    venuePersonality: 'monumental',
    motionLevel: 'calm',
    editorialDensity: 'balanced',
    contentTone: 'human',
  },
});

describe('content path utils', () => {
  it('reads nested string values and defaults to empty', () => {
    expect(getAtPath({ a: { b: 'x' } }, 'a.b')).toBe('x');
    expect(getAtPath({ a: {} }, 'a.b')).toBe('');
    expect(getAtPath(null, 'a.b')).toBe('');
  });

  it('sets nested values immutably', () => {
    const original = { a: { b: 'x' }, keep: 'y' };
    const next = setAtPath(original, 'a.b', 'z') as typeof original;
    expect(next.a.b).toBe('z');
    expect(next.keep).toBe('y');
    expect(original.a.b).toBe('x');
  });

  it('creates missing branches', () => {
    const next = setAtPath({}, 'cta.label', 'join') as {
      cta: { label: string };
    };
    expect(next.cta.label).toBe('join');
  });
});

describe('composer reducer', () => {
  it('updates a field only in the active locale', () => {
    const next = composerReducer(state(), {
      type: 'updateField',
      sceneId: 'a',
      path: 'headline',
      value: 'חדש',
    });
    expect(getAtPath(next.scenesByLocale.he[0]?.content, 'headline')).toBe(
      'חדש',
    );
    expect(getAtPath(next.scenesByLocale.en[0]?.content, 'headline')).toBe(
      'hello',
    );
  });

  it('reorders scenes in every locale together', () => {
    const next = composerReducer(state(), {
      type: 'move',
      sceneId: 'c',
      direction: 'up',
    });
    expect(next.scenesByLocale.he.map((s) => s.id)).toEqual(['a', 'c', 'b']);
    expect(next.scenesByLocale.en.map((s) => s.id)).toEqual(['a', 'c', 'b']);
  });

  it('ignores impossible moves', () => {
    const next = composerReducer(state(), {
      type: 'move',
      sceneId: 'a',
      direction: 'up',
    });
    expect(next.scenesByLocale.he.map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });

  it('duplicates a scene after itself in every locale', () => {
    const next = composerReducer(state(), {
      type: 'duplicate',
      sceneId: 'b',
    });
    expect(next.scenesByLocale.he.map((s) => s.id)).toEqual([
      'a',
      'b',
      'b-copy',
      'c',
    ]);
    expect(next.scenesByLocale.en[2]?.id).toBe('b-copy');
  });

  it('toggles visibility across locales', () => {
    const next = composerReducer(state(), { type: 'toggle', sceneId: 'b' });
    expect(next.scenesByLocale.he[1]?.enabled).toBe(false);
    expect(next.scenesByLocale.en[1]?.enabled).toBe(false);
  });

  it('renames only in the active locale', () => {
    const next = composerReducer(state(), {
      type: 'rename',
      sceneId: 'a',
      title: 'פתיחה חדשה',
    });
    expect(next.scenesByLocale.he[0]?.title).toBe('פתיחה חדשה');
    expect(next.scenesByLocale.en[0]?.title).toBe('a');
  });

  it('keeps state immutable', () => {
    const original = state();
    composerReducer(original, {
      type: 'updateField',
      sceneId: 'a',
      path: 'headline',
      value: 'x',
    });
    expect(getAtPath(original.scenesByLocale.he[0]?.content, 'headline')).toBe(
      'שלום',
    );
  });

  it('updates identity dimensions', () => {
    const next = composerReducer(state(), {
      type: 'setIdentity',
      dimension: 'atmosphere',
      value: 'warm',
    });
    expect(next.identity.atmosphere).toBe('warm');
    expect(next.identity.photographyStyle).toBe('dusk');
  });
});
