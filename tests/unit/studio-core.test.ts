import { describe, expect, it } from 'vitest';
import { duplicateSlug, toEventSlug } from '@/features/events/utils/slug';
import { isLaunchable } from '@/features/events/utils/launch';
import type { EventHealth } from '@/event-engine';

const health = (blockers: number): EventHealth => ({
  phase: 'planning',
  publishStatus: 'draft',
  capabilities: [],
  invalidCapabilities: [],
  findings: [],
  blockers,
  warnings: 0,
  readinessScore: 100,
  translationCompleteness: 100,
  mediaCompleteness: 100,
  requiredActions: [],
  availableTransitions: [],
});

describe('studio core services', () => {
  it('builds ASCII-safe slugs from titles in any language', () => {
    expect(toEventSlug('Demo Conference 2026')).toBe('demo-conference-2026');
    /*
     * A Hebrew title romanizes: the address must stay ASCII so server
     * redirects and route params never break on raw Unicode.
     */
    expect(toEventSlug('  כנס  הדגמה  ')).toBe('kns-hdgmh');
    expect(toEventSlug('ועידת שיא 2027')).toBe('vaydt-shya-2027');
    expect(toEventSlug('Café Été')).toBe('cafe-ete');
    expect(toEventSlug('!!!')).toMatch(/^event-/);
    expect(toEventSlug('כנס')).toMatch(/^[a-z0-9-]+$/);
  });

  it('creates unique duplicate slugs', () => {
    const first = duplicateSlug('demo');
    expect(first.startsWith('demo-copy-')).toBe(true);
  });

  it('gates launch on blockers only', () => {
    expect(isLaunchable(health(0))).toBe(true);
    expect(isLaunchable(health(1))).toBe(false);
  });
});
