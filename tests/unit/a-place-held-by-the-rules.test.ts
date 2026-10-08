import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cancellationAllowed, registrationWindow } from '@/registration-engine';

/*
 * The four optional fields the Studio writes on an activity — when
 * registration opens and closes, whether a place may be given back and
 * until when — used to be stored and never read. Now they are rules:
 * held on the server, shown on the button, and a waiting list is
 * promoted the moment the Studio makes room.
 */
const T = (iso: string): number => Date.parse(iso);
const NOW = T('2026-10-10T10:00:00.000Z');

describe('the registration window', () => {
  it('is open when nothing was written, and a date that cannot be read is no date', () => {
    expect(registrationWindow({}, NOW)).toBe('open');
    expect(registrationWindow({ registrationOpensAt: 'soon', registrationClosesAt: '' }, NOW)).toBe('open');
  });

  it('is not yet open before the opening moment, and closed from the closing moment', () => {
    expect(registrationWindow({ registrationOpensAt: '2026-10-11T00:00:00.000Z' }, NOW)).toBe('notYet');
    expect(registrationWindow({ registrationOpensAt: '2026-10-10T10:00:00.000Z' }, NOW)).toBe('open');
    expect(registrationWindow({ registrationClosesAt: '2026-10-10T10:00:00.000Z' }, NOW)).toBe('closed');
    expect(registrationWindow({ registrationClosesAt: '2026-10-10T10:00:01.000Z' }, NOW)).toBe('open');
  });

  it('lets a place go back unless told otherwise, and only until the deadline', () => {
    expect(cancellationAllowed({}, NOW)).toBe(true);
    expect(cancellationAllowed({ allowCancellation: false }, NOW)).toBe(false);
    expect(cancellationAllowed({ cancellationDeadline: '2026-10-09T00:00:00.000Z' }, NOW)).toBe(false);
    expect(cancellationAllowed({ cancellationDeadline: '2026-10-12T00:00:00.000Z' }, NOW)).toBe(true);
    expect(cancellationAllowed({ allowCancellation: true, cancellationDeadline: 'never' }, NOW)).toBe(true);
  });
});

/* ---------- the service holds the rule ---------- */
interface Row {
  id: string;
  eventSlug: string;
  title: string;
  capacity: number | null;
  waitlistEnabled: boolean;
  startsAt?: string;
  endsAt?: string;
  registrationOpensAt?: string;
  registrationClosesAt?: string;
  allowCancellation?: boolean;
  cancellationDeadline?: string;
}
interface Reg {
  id: string;
  sessionId: string;
  participantId: string;
  status: string;
  waitlistPosition: number | null;
}

const state = {
  sessions: [] as Row[],
  regs: [] as Reg[],
  events: [] as string[],
  changes: [] as string[],
};

vi.mock('@/features/registration', () => ({
  currentParticipant: async () => ({ id: 'p1', name: 'Dana', email: 'dana@example.org' }),
}));
vi.mock('@/features/access', () => ({ staffRoleOf: async () => null }));
vi.mock('@/foundation/event-bus', () => ({
  emitRegistration: async (event: { type: string; participantId: string }) => {
    state.events.push(`${event.type}:${event.participantId}`);
  },
}));
vi.mock('@/features/program/services/session-change-notices', () => ({
  announceSessionCancelled: async () => undefined,
  announceSessionChange: async (_slug: string, id: string) => {
    state.changes.push(id);
  },
}));
vi.mock('@/infrastructure', () => ({
  staffOnlyConferenceSlug: async () => null,
  notificationOutbox: { enqueue: async () => undefined },
  sessionRepository: {
    /* Each read is its own copy, as a row from the database is. */
    getById: async (id: string) => {
      const row = state.sessions.find((entry) => entry.id === id);
      return row ? { ...row } : null;
    },
    update: async (id: string, input: Partial<Row>) => {
      const row = state.sessions.find((entry) => entry.id === id);
      if (!row) return null;
      Object.assign(row, input);
      return { ...row };
    },
    countsBySession: async (id: string) => ({
      confirmed: state.regs.filter((r) => r.sessionId === id && r.status === 'confirmed').length,
      pending: 0,
      waitlisted: state.regs.filter((r) => r.sessionId === id && r.status === 'waitlisted').length,
    }),
    listByEvent: async () => [],
  },
  sessionRegistrationRepository: {
    find: async (sessionId: string, participantId: string) =>
      state.regs.find((r) => r.sessionId === sessionId && r.participantId === participantId) ?? null,
    registerParticipant: async (sessionId: string, participantId: string, status: string, waitlistPosition: number | null) => {
      const reg = { id: `r${state.regs.length + 1}`, sessionId, participantId, status, waitlistPosition };
      state.regs.push(reg);
      return reg;
    },
    setStatus: async (id: string, status: string) => {
      const reg = state.regs.find((r) => r.id === id);
      if (reg) reg.status = status;
      return reg ?? null;
    },
    waitlistForSession: async (sessionId: string) =>
      state.regs
        .filter((r) => r.sessionId === sessionId && r.status === 'waitlisted')
        .map((r) => ({ registrationId: r.id, participantId: r.participantId, position: r.waitlistPosition ?? 0 })),
    listForParticipant: async () => [],
  },
}));

const load = () => import('@/features/program/services/program-service');

const session = (over: Partial<Row> = {}): Row => ({
  id: 's1',
  eventSlug: 'summit',
  title: 'Workshop',
  capacity: 2,
  waitlistEnabled: true,
  startsAt: '2027-01-01T09:00:00.000Z',
  endsAt: '2027-01-01T10:00:00.000Z',
  ...over,
});

describe('registering by the window', () => {
  beforeEach(() => {
    state.sessions = [];
    state.regs = [];
    state.events = [];
    state.changes = [];
  });

  it('takes a registration inside the window', async () => {
    state.sessions = [session({ registrationOpensAt: '2020-01-01T00:00:00.000Z', registrationClosesAt: '2099-01-01T00:00:00.000Z' })];
    const program = await load();
    expect((await program.selectWorkshop('s1', 'he')).status).toBe('confirmed');
  });

  it('refuses before it opens, and after it closes — whatever the link said', async () => {
    state.sessions = [session({ registrationOpensAt: '2099-01-01T00:00:00.000Z' })];
    const program = await load();
    await expect(program.selectWorkshop('s1', 'he')).rejects.toThrow('Registration not open yet');
    state.sessions = [session({ registrationClosesAt: '2020-01-01T00:00:00.000Z' })];
    await expect(program.selectWorkshop('s1', 'he')).rejects.toThrow('Registration closed');
    expect(state.regs).toEqual([]);
  });

  it('keeps a confirmed seat when the activity forbids cancelling, or the deadline has passed', async () => {
    state.sessions = [session({ allowCancellation: false })];
    state.regs = [{ id: 'r1', sessionId: 's1', participantId: 'p1', status: 'confirmed', waitlistPosition: null }];
    const program = await load();
    await expect(program.leaveWorkshop('s1', 'he')).rejects.toThrow('Cancellation not allowed');
    state.sessions = [session({ cancellationDeadline: '2020-01-01T00:00:00.000Z' })];
    await expect(program.leaveWorkshop('s1', 'he')).rejects.toThrow('Cancellation not allowed');
    expect(state.regs[0]?.status).toBe('confirmed');
  });

  it('always lets a person leave the waiting list — nothing was promised', async () => {
    state.sessions = [session({ allowCancellation: false })];
    state.regs = [{ id: 'r1', sessionId: 's1', participantId: 'p1', status: 'waitlisted', waitlistPosition: 1 }];
    const program = await load();
    expect((await program.leaveWorkshop('s1', 'he'))?.status).toBe('cancelled');
  });

  it('gives a seat back while the activity allows it', async () => {
    state.sessions = [session({ cancellationDeadline: '2099-01-01T00:00:00.000Z' })];
    state.regs = [{ id: 'r1', sessionId: 's1', participantId: 'p1', status: 'confirmed', waitlistPosition: null }];
    const program = await load();
    expect((await program.leaveWorkshop('s1', 'he'))?.status).toBe('cancelled');
  });
});

describe('making room in the Studio', () => {
  beforeEach(() => {
    state.sessions = [session({ capacity: 1 })];
    state.regs = [
      { id: 'r1', sessionId: 's1', participantId: 'p1', status: 'confirmed', waitlistPosition: null },
      { id: 'r2', sessionId: 's1', participantId: 'p2', status: 'waitlisted', waitlistPosition: 1 },
      { id: 'r3', sessionId: 's1', participantId: 'p3', status: 'waitlisted', waitlistPosition: 2 },
    ];
    state.events = [];
    state.changes = [];
  });

  it('promotes the first in line when the capacity is raised, as many as fit', async () => {
    const program = await load();
    await program.updateSession('s1', 'he', { capacity: 2 });
    expect(state.regs.map((r) => r.status)).toEqual(['confirmed', 'confirmed', 'waitlisted']);
    expect(state.events).toEqual(['registration.promoted:p2']);
  });

  it('promotes everyone when the limit is lifted', async () => {
    const program = await load();
    await program.updateSession('s1', 'he', { capacity: null });
    expect(state.regs.map((r) => r.status)).toEqual(['confirmed', 'confirmed', 'confirmed']);
    expect(state.events).toEqual(['registration.promoted:p2', 'registration.promoted:p3']);
  });

  it('promotes no one when the room did not grow', async () => {
    const program = await load();
    await program.updateSession('s1', 'he', { title: 'Renamed' });
    await program.updateSession('s1', 'he', { capacity: 1 });
    expect(state.regs.map((r) => r.status)).toEqual(['confirmed', 'waitlisted', 'waitlisted']);
    expect(state.events).toEqual([]);
    expect(state.changes).toEqual(['s1', 's1']);
  });
});

/* ---------- the button says it ---------- */
describe('what the guest sees', () => {
  const read = (file: string): string => readFileSync(file, 'utf8');

  it('has words for a window that has not opened and one that has closed', () => {
    const kit = read('src/features/conference/ui/kit.tsx');
    expect(kit).toContain("opensLater: { he: 'ההרשמה טרם נפתחה', en: 'Registration not open yet' }");
    expect(kit).toContain("closed: { he: 'ההרשמה נסגרה', en: 'Registration closed' }");
    expect(kit).toContain("if (state === 'registered' && (!canLeave || !leaveAction))");
  });

  it('reads the window and the cancellation rule into every activity', () => {
    const model = read('src/features/program/services/program-model.ts');
    expect(model).toContain('registrationWindow(session, now)');
    expect(model).toContain("canCancel: st !== 'confirmed' || cancellationAllowed(session, now)");
    expect(model).toContain('ההרשמה נפתחת ב-');
    const card = read('src/features/conference/components/activity-card.tsx');
    const drawer = read('src/features/conference/components/activity-drawer.tsx');
    expect(card).toContain('canLeave={activity.canCancel}');
    expect(drawer.split('canLeave={activity.canCancel}').length - 1).toBe(2);
    const row = read('src/app/(frontend)/[locale]/events/[slug]/my-activities/schedule-row.tsx');
    expect(row).toContain('held && !past && activity.canCancel');
    expect(row).toContain("t(locale, 'cannotCancel')");
  });

  it('turns the server refusal into a notice the guest can read', () => {
    for (const file of [
      'src/app/(frontend)/[locale]/events/[slug]/(experience)/agenda/actions.ts',
      'src/app/(frontend)/[locale]/events/[slug]/my-activities/actions.ts',
      'src/app/(frontend)/[locale]/events/[slug]/workshops/actions.ts',
    ]) {
      const actions = read(file);
      expect(actions).toContain("'Registration not open yet'");
      expect(actions).toContain("'Registration closed'");
    }
    expect(read('src/app/(frontend)/[locale]/events/[slug]/my-activities/actions.ts')).toContain('noCancel');
  });
});
