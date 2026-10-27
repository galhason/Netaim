import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { closingPatch, registrationWindow, reopeningPatch } from '@/registration-engine';

/*
 * Closing registration keeps everyone in.
 *
 * Before the conference the organisers close registration to the
 * activities — several at once, from the activities list — and the
 * promise is the one they asked for: whoever is registered stays
 * registered. Closing writes the activity's window and nothing else; no
 * registration is read, moved or cancelled, and nobody is mailed.
 */
const read = (file: string): string => readFileSync(file, 'utf8');

const NOW = Date.parse('2026-10-27T10:00:00.000Z');
const LATER = '2026-11-01T10:00:00.000Z';
const EARLIER = '2026-10-20T10:00:00.000Z';

describe('the two switches', () => {
  it('closing an open activity closes it from now', () => {
    const patch = closingPatch({}, NOW);
    expect(patch).toEqual({ registrationClosesAt: new Date(NOW).toISOString() });
    expect(registrationWindow({ ...patch }, NOW)).toBe('closed');
  });

  it('closing one that was due to close later brings the close forward', () => {
    expect(closingPatch({ registrationClosesAt: LATER }, NOW)).toEqual({ registrationClosesAt: new Date(NOW).toISOString() });
  });

  it('closing one not yet open drops the opening, so it reads closed', () => {
    const patch = closingPatch({ registrationOpensAt: LATER }, NOW);
    expect(patch).toEqual({ registrationClosesAt: new Date(NOW).toISOString(), registrationOpensAt: '' });
  });

  it('closing one already closed changes nothing', () => {
    expect(closingPatch({ registrationClosesAt: EARLIER }, NOW)).toBeNull();
  });

  it('reopening removes the close; reopening an open one changes nothing', () => {
    expect(reopeningPatch({ registrationClosesAt: EARLIER }, NOW)).toEqual({ registrationClosesAt: '' });
    expect(reopeningPatch({}, NOW)).toBeNull();
  });
});

const sessions = new Map<string, Record<string, unknown>>();
const writes: { id: string; patch: Record<string, unknown> }[] = [];
const touched: string[] = [];

vi.mock('@/infrastructure', () => ({
  sessionRepository: {
    getById: async (id: string) => sessions.get(id) ?? null,
    update: async (id: string, patch: Record<string, unknown>) => {
      writes.push({ id, patch });
      return { ...sessions.get(id), ...patch };
    },
  },
  sessionRegistrationRepository: new Proxy(
    {},
    {
      get: (_target, name) => () => {
        touched.push(String(name));
        throw new Error('registrations must not be touched');
      },
    },
  ),
  staffOnlyConferenceSlug: async () => null,
}));
vi.mock('@/foundation/event-bus', () => ({ emitRegistration: async () => touched.push('emit') }));
vi.mock('@/features/access', () => ({ staffRoleOf: () => null }));
vi.mock('@/features/registration', () => ({ currentParticipant: async () => null }));
vi.mock('@/features/program/services/session-change-notices', () => ({
  announceLanguageDecided: async () => touched.push('mail'),
  announceSessionCancelled: async () => touched.push('mail'),
  announceSessionChange: async () => touched.push('mail'),
}));

const { setRegistrationOpen } = await import('@/features/program/services/program-service');

beforeEach(() => {
  sessions.clear();
  writes.length = 0;
  touched.length = 0;
  sessions.set('1', { id: '1', eventSlug: 'summit' });
  sessions.set('2', { id: '2', eventSlug: 'summit', registrationClosesAt: EARLIER });
  sessions.set('3', { id: '3', eventSlug: 'another' });
  sessions.set('4', { id: '4', eventSlug: 'summit', archivedAt: EARLIER });
});

describe('closing several activities in one press', () => {
  it('writes only the window of this conference’s live activities, and never a registration', async () => {
    const changed = await setRegistrationOpen('summit', ['1', '2', '3', '4', '1', '99'], false);
    expect(changed).toEqual(['1']);
    expect(writes).toHaveLength(1);
    expect(Object.keys(writes[0]!.patch)).toEqual(['registrationClosesAt']);
    expect(touched).toEqual([]);
  });

  it('reopening writes back only the closed ones', async () => {
    expect(await setRegistrationOpen('summit', ['1', '2'], true)).toEqual(['2']);
    expect(writes).toEqual([{ id: '2', patch: { registrationClosesAt: '' } }]);
    expect(touched).toEqual([]);
  });
});

describe('the Studio', () => {
  it('offers it on the activities list, behind the permission to shape the programme', () => {
    const actions = read('src/app/(studio)/studio/(console)/activity/actions.ts');
    expect(actions).toMatch(/export const setActivitiesRegistrationAction[\s\S]*?actorFor\('activities:manage', slug\)/);
    const manager = read('src/app/(studio)/studio/(console)/activity/activity-manager.tsx');
    expect(manager).toContain('setActivitiesRegistrationAction({ slug, sessionIds: [...chosen], open: reopen })');
    expect(manager).toContain('const selecting = can.manage && Boolean(slug);');
  });

  it('a held place is still shown as held when registration is closed', () => {
    const model = read('src/features/program/services/program-model.ts');
    const held = model.indexOf("registration = 'registered';");
    const closed = model.indexOf("registration = gate === 'notYet' ? 'opensLater' : 'closed';");
    expect(held).toBeGreaterThan(-1);
    expect(held).toBeLessThan(closed);
  });
});

describe('the activities list reads the conference clock', () => {
  it('every date and hour is formatted on the conference timezone, never the operator’s computer', () => {
    const manager = read('src/app/(studio)/studio/(console)/activity/activity-manager.tsx');
    expect(manager).toContain("new Intl.DateTimeFormat(tag, { hour: '2-digit', minute: '2-digit', timeZone }).format(d);");
    expect(manager).toContain("{ year: 'numeric', month: '2-digit', day: '2-digit', timeZone }");
    expect(manager).not.toMatch(/new Intl\.DateTimeFormat\(tag, \{ hour: '2-digit', minute: '2-digit' \}\)/);
    expect(read('src/app/(studio)/studio/(console)/activity/page.tsx')).toContain('const timeZone = event?.timezone ?? DEFAULT_VENUE_TIMEZONE;');
  });
});
