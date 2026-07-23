import { describe, expect, it } from 'vitest';
import {
  anonymizeParticipant,
  applyTransition,
  canTransition,
  computeCapacity,
  decideOutcome,
  deriveRegistrationState,
  eventForTransition,
  nextInLine,
  offerExpired,
  promotable,
  retentionExpired,
  TOMBSTONE_EMAIL,
  type CapacityView,
} from '@/registration-engine';
import { evaluateReadiness, type ReadinessInput } from '@/event-engine';

const capacity = (over: Partial<CapacityView> = {}): CapacityView => ({
  limit: 100,
  confirmed: 0,
  reserved: 0,
  waiting: 0,
  available: 100,
  state: 'open',
  ...over,
});

describe('registration transitions', () => {
  it('permits only legal transitions', () => {
    expect(canTransition('pending', 'confirmed')).toBe(true);
    expect(canTransition('waitlisted', 'confirmed')).toBe(true);
    expect(canTransition('confirmed', 'pending')).toBe(false);
    expect(canTransition('cancelled', 'confirmed')).toBe(false);
  });

  it('reports failed transitions instead of throwing', () => {
    expect(applyTransition('pending', 'confirmed')).toEqual({
      ok: true,
      status: 'confirmed',
    });
    expect(applyTransition('attended', 'pending')).toEqual({
      ok: false,
      from: 'attended',
      to: 'pending',
    });
  });

  it('maps transitions to participant-facing events', () => {
    expect(eventForTransition('waitlisted', 'confirmed')).toBe(
      'registration.promoted',
    );
    expect(eventForTransition('pending', 'confirmed')).toBe(
      'registration.approved',
    );
    expect(eventForTransition('confirmed', 'attended')).toBeNull();
  });
});

describe('capacity', () => {
  it('is unlimited when no limit is set', () => {
    const view = computeCapacity({
      limit: null,
      confirmed: 5,
      pending: 2,
      waitlisted: 0,
    });
    expect(view.state).toBe('unlimited');
    expect(view.available).toBeNull();
  });

  it('bands open, limited and full', () => {
    expect(
      computeCapacity({ limit: 100, confirmed: 10, pending: 0, waitlisted: 0 })
        .state,
    ).toBe('open');
    expect(
      computeCapacity({ limit: 100, confirmed: 95, pending: 0, waitlisted: 0 })
        .state,
    ).toBe('limited');
    expect(
      computeCapacity({ limit: 100, confirmed: 100, pending: 0, waitlisted: 3 })
        .state,
    ).toBe('full');
  });

  it('counts pending against availability', () => {
    const view = computeCapacity({
      limit: 100,
      confirmed: 40,
      pending: 10,
      waitlisted: 0,
    });
    expect(view.available).toBe(50);
    expect(view.reserved).toBe(10);
  });
});

describe('mode outcome', () => {
  it('queues approval, confirms invitation, gates open by capacity', () => {
    expect(decideOutcome('approval', capacity())).toBe('pending');
    expect(decideOutcome('invitation', capacity({ state: 'full' }))).toBe(
      'confirmed',
    );
    expect(decideOutcome('open', capacity())).toBe('confirmed');
    expect(decideOutcome('open', capacity({ state: 'full' }))).toBe(
      'waitlisted',
    );
  });
});

describe('waitlist', () => {
  const entries = [
    { registrationId: 'c', position: 3 },
    { registrationId: 'a', position: 1 },
    { registrationId: 'b', position: 2 },
  ];

  it('serves the queue in order', () => {
    expect(nextInLine(entries)?.registrationId).toBe('a');
    expect(promotable(entries, 2).map((e) => e.registrationId)).toEqual([
      'a',
      'b',
    ]);
    expect(promotable(entries, 0)).toEqual([]);
  });

  it('detects expired offers', () => {
    const now = Date.parse('2026-07-16T12:00:00Z');
    expect(
      offerExpired(
        { registrationId: 'a', position: 1, offerExpiresAt: '2026-07-16T10:00:00Z' },
        now,
      ),
    ).toBe(true);
    expect(
      offerExpired({ registrationId: 'a', position: 1 }, now),
    ).toBe(false);
  });
});

describe('public registration state', () => {
  const now = Date.parse('2026-07-16T12:00:00Z');
  const base = {
    published: true,
    waitlistEnabled: true,
    capacity: capacity(),
    now,
  };

  it('derives every state from settings, capacity and time', () => {
    expect(deriveRegistrationState({ ...base, published: false })).toBe('draft');
    expect(deriveRegistrationState({ ...base, cancelled: true })).toBe(
      'cancelled',
    );
    expect(
      deriveRegistrationState({
        ...base,
        eventEndedAt: '2026-07-15T00:00:00Z',
      }),
    ).toBe('completed');
    expect(
      deriveRegistrationState({ ...base, opensAt: '2026-07-20T00:00:00Z' }),
    ).toBe('closed');
    expect(
      deriveRegistrationState({ ...base, capacity: capacity({ state: 'full' }) }),
    ).toBe('waitlist');
    expect(
      deriveRegistrationState({
        ...base,
        waitlistEnabled: false,
        capacity: capacity({ state: 'full' }),
      }),
    ).toBe('closed');
    expect(
      deriveRegistrationState({
        ...base,
        capacity: capacity({ state: 'limited' }),
      }),
    ).toBe('limited');
    expect(deriveRegistrationState(base)).toBe('open');
  });
});

describe('data protection', () => {
  it('anonymizes identity while keeping a tombstone', () => {
    const anon = anonymizeParticipant('2026-07-16T00:00:00Z');
    expect(anon.email).toBe(TOMBSTONE_EMAIL);
    expect(anon.phone).toBeUndefined();
  });

  it('honours the retention window', () => {
    const now = Date.parse('2026-07-16T00:00:00Z');
    expect(
      retentionExpired('2026-01-01T00:00:00Z', { days: 30 }, now),
    ).toBe(true);
    expect(retentionExpired('2026-07-10T00:00:00Z', { days: 30 }, now)).toBe(
      false,
    );
    expect(retentionExpired('2020-01-01T00:00:00Z', { days: null }, now)).toBe(
      false,
    );
  });
});

describe('registration readiness rules', () => {
  const input = (
    registration: ReadinessInput['registration'],
  ): ReadinessInput => ({
    phase: 'planning',
    capabilities: ['registration'],
    experience: null,
    program: null,
    venue: { present: true, hasAccessibilityInfo: true, hasEmergencyInfo: true },
    localization: { enabledLocales: ['he'], missingTranslations: 0 },
    registration,
  });

  it('blocks when registration is enabled but not configured', () => {
    const ids = evaluateReadiness(input({ configured: false })).map(
      (f) => f.id,
    );
    expect(ids).toContain('registration/config-missing');
  });

  it('stays quiet when registration facts are simply absent', () => {
    const ids = evaluateReadiness(input(null)).map((f) => f.id);
    expect(ids).not.toContain('registration/config-missing');
  });

  it('warns on missing capacity and confirmation', () => {
    const ids = evaluateReadiness(
      input({
        configured: true,
        requiresCapacity: true,
        capacitySet: false,
        hasConfirmationMessage: false,
      }),
    ).map((f) => f.id);
    expect(ids).toContain('registration/capacity-missing');
    expect(ids).toContain('registration/confirmation-missing');
  });

  it('is quiet when registration is fully configured', () => {
    const ids = evaluateReadiness(
      input({
        configured: true,
        requiresCapacity: true,
        capacitySet: true,
        hasConfirmationMessage: true,
      }),
    ).map((f) => f.id);
    expect(ids).not.toContain('registration/config-missing');
    expect(ids).not.toContain('registration/capacity-missing');
    expect(ids).not.toContain('registration/confirmation-missing');
  });
});
