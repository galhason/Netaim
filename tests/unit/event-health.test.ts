import { describe, expect, it } from 'vitest';
import {
  computeEventHealth,
  type EventHealthInput,
  type ReadinessInput,
} from '@/event-engine';

const readiness = (overrides?: Partial<ReadinessInput>): ReadinessInput => ({
  phase: 'planning',
  capabilities: ['registration'],
  experience: {
    sceneCount: 7,
    hasHero: true,
    heroHasImage: true,
    hasJoin: true,
  },
  program: { sessions: [], speakersWithoutPhoto: 0 },
  venue: { present: true, hasAccessibilityInfo: true, hasEmergencyInfo: true },
  localization: { enabledLocales: ['he', 'en'], missingTranslations: 0 },
  registration: null,
  ...overrides,
});

const input = (overrides?: Partial<EventHealthInput>): EventHealthInput => ({
  phase: 'planning',
  publishStatus: 'published',
  declaredCapabilities: ['registration'],
  readiness: readiness(),
  experienceFindings: [],
  translationCompleteness: 100,
  mediaCompleteness: 100,
  ...overrides,
});

describe('event health', () => {
  it('scores a clean event at 100', () => {
    const health = computeEventHealth(input());
    expect(health.readinessScore).toBe(100);
    expect(health.blockers).toBe(0);
    expect(health.requiredActions).toEqual([]);
  });

  it('aggregates readiness and experience findings in one place', () => {
    const health = computeEventHealth(
      input({
        readiness: readiness({
          venue: {
            present: true,
            hasAccessibilityInfo: true,
            hasEmergencyInfo: false,
          },
        }),
        experienceFindings: [
          {
            id: 'inspector/example',
            severity: 'advice',
            category: 'experience',
            message: { he: 'x', en: 'x' },
            action: { he: 'y', en: 'y' },
          },
        ],
      }),
    );
    expect(health.findings.map((f) => f.id)).toEqual([
      'safety/emergency-missing',
      'inspector/example',
    ]);
    expect(health.blockers).toBe(1);
    expect(health.readinessScore).toBe(100 - 15 - 1);
  });

  it('puts blockers first in required actions and excludes advice', () => {
    const health = computeEventHealth(
      input({
        readiness: readiness({
          venue: {
            present: false,
            hasAccessibilityInfo: false,
            hasEmergencyInfo: false,
          },
          program: { sessions: [], speakersWithoutPhoto: 2 },
        }),
      }),
    );
    expect(health.requiredActions[0]?.severity).toBe('blocker');
    expect(
      health.requiredActions.every((f) => f.severity !== 'advice'),
    ).toBe(true);
  });

  it('reports invalid capability combinations', () => {
    const health = computeEventHealth(
      input({ declaredCapabilities: ['waitlist'] }),
    );
    expect(health.capabilities).toEqual([]);
    expect(health.invalidCapabilities).toEqual([
      { capability: 'waitlist', missing: ['registration'] },
    ]);
  });

  it('derives available transitions from phase and capabilities', () => {
    const health = computeEventHealth(input());
    expect(health.availableTransitions).toEqual([
      'registrationOpen',
      'preparation',
    ]);
    const withoutRegistration = computeEventHealth(
      input({ declaredCapabilities: [] }),
    );
    expect(withoutRegistration.availableTransitions).toEqual(['preparation']);
  });
});
