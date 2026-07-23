import { describe, expect, it } from 'vitest';
import { evaluateReadiness, type ReadinessInput } from '@/event-engine';

const readyInput = (): ReadinessInput => ({
  phase: 'planning',
  capabilities: ['registration'],
  experience: {
    sceneCount: 7,
    hasHero: true,
    heroHasImage: true,
    hasJoin: true,
  },
  program: {
    sessions: [
      { start: '2026-09-01T09:00:00Z', end: '2026-09-01T10:00:00Z', room: 'a' },
      { start: '2026-09-01T10:30:00Z', end: '2026-09-01T12:00:00Z', room: 'a' },
    ],
    speakersWithoutPhoto: 0,
  },
  venue: {
    present: true,
    hasAccessibilityInfo: true,
    hasEmergencyInfo: true,
  },
  localization: { enabledLocales: ['he', 'en'], missingTranslations: 0 },
  registration: {
    closesAt: '2026-08-30T00:00:00Z',
    eventStartsAt: '2026-09-01T06:00:00Z',
  },
});

const findingIds = (input: ReadinessInput) =>
  evaluateReadiness(input).map((finding) => finding.id);

describe('readiness engine', () => {
  it('returns no findings for a ready event', () => {
    expect(evaluateReadiness(readyInput())).toEqual([]);
  });

  it('flags a hero without photography', () => {
    const input = readyInput();
    input.experience = { ...input.experience!, heroHasImage: false };
    expect(findingIds(input)).toContain('experience/hero-image-missing');
  });

  it('blocks on a missing venue', () => {
    const input = readyInput();
    input.venue = {
      present: false,
      hasAccessibilityInfo: false,
      hasEmergencyInfo: false,
    };
    const findings = evaluateReadiness(input);
    const venue = findings.find((f) => f.id === 'venue/missing');
    expect(venue?.severity).toBe('blocker');
  });

  it('blocks on missing emergency information', () => {
    const input = readyInput();
    input.venue = { ...input.venue, hasEmergencyInfo: false };
    expect(findingIds(input)).toContain('safety/emergency-missing');
  });

  it('warns on missing accessibility information', () => {
    const input = readyInput();
    input.venue = { ...input.venue, hasAccessibilityInfo: false };
    expect(findingIds(input)).toContain('venue/accessibility-missing');
  });

  it('warns on incomplete translations', () => {
    const input = readyInput();
    input.localization = {
      enabledLocales: ['he', 'en'],
      missingTranslations: 4,
    };
    expect(findingIds(input)).toContain('localization/incomplete');
  });

  it('blocks on overlapping sessions in the same room', () => {
    const input = readyInput();
    input.program = {
      sessions: [
        {
          start: '2026-09-01T09:00:00Z',
          end: '2026-09-01T10:30:00Z',
          room: 'a',
        },
        {
          start: '2026-09-01T10:00:00Z',
          end: '2026-09-01T11:00:00Z',
          room: 'a',
        },
      ],
      speakersWithoutPhoto: 0,
    };
    expect(findingIds(input)).toContain('program/overlap');
  });

  it('ignores overlaps across different rooms', () => {
    const input = readyInput();
    input.program = {
      sessions: [
        {
          start: '2026-09-01T09:00:00Z',
          end: '2026-09-01T10:30:00Z',
          room: 'a',
        },
        {
          start: '2026-09-01T10:00:00Z',
          end: '2026-09-01T11:00:00Z',
          room: 'b',
        },
      ],
      speakersWithoutPhoto: 0,
    };
    expect(findingIds(input)).not.toContain('program/overlap');
  });

  it('warns when registration closes after the event starts', () => {
    const input = readyInput();
    input.registration = {
      closesAt: '2026-09-02T00:00:00Z',
      eventStartsAt: '2026-09-01T06:00:00Z',
    };
    expect(findingIds(input)).toContain('registration/closes-after-start');
  });

  it('skips registration checks without the capability', () => {
    const input = readyInput();
    input.capabilities = [];
    input.registration = {
      closesAt: '2026-09-02T00:00:00Z',
      eventStartsAt: '2026-09-01T06:00:00Z',
    };
    expect(findingIds(input)).not.toContain(
      'registration/closes-after-start',
    );
  });
});
