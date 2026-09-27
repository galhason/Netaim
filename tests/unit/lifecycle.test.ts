import { describe, expect, it } from 'vitest';
import {
  availableTransitions,
  canTransition,
  transitionEvent,
} from '@/event-engine';

describe('event lifecycle engine', () => {
  it('allows the documented forward path', () => {
    const capabilities = ['registration'] as const;
    expect(canTransition('draft', 'planning', capabilities)).toBe(true);
    expect(canTransition('planning', 'registrationOpen', capabilities)).toBe(
      true,
    );
    expect(
      canTransition('registrationOpen', 'registrationClosed', capabilities),
    ).toBe(true);
    expect(
      canTransition('registrationClosed', 'preparation', capabilities),
    ).toBe(true);
    expect(canTransition('preparation', 'live', capabilities)).toBe(true);
    expect(canTransition('live', 'completed', capabilities)).toBe(true);
    expect(canTransition('completed', 'archived', capabilities)).toBe(true);
  });

  it('makes illegal transitions impossible', () => {
    expect(canTransition('draft', 'live', ['registration'])).toBe(false);
    expect(canTransition('live', 'draft', ['registration'])).toBe(false);
    expect(canTransition('archived', 'live', ['registration'])).toBe(false);
  });

  /*
   * `archived` joins every phase's list because retiring a conference is
   * not a step in its progression -- see the map. It is expected in these
   * two sets, and its absence from the registration filter is the point
   * of the first assertion.
   */
  it('hides registration phases from events without the capability', () => {
    expect(availableTransitions('planning', [])).toEqual([
      'preparation',
      'archived',
    ]);
    expect(canTransition('planning', 'registrationOpen', [])).toBe(false);
  });

  it('keeps archive reversible', () => {
    expect(canTransition('archived', 'completed', [])).toBe(true);
  });

  it('returns the allowed set on rejected transitions', () => {
    const result = transitionEvent('draft', 'live', []);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.allowed).toEqual(['planning', 'archived']);
    }
  });

  it('confirms accepted transitions immutably', () => {
    const result = transitionEvent('draft', 'planning', []);
    expect(result).toEqual({ ok: true, phase: 'planning' });
  });
});
