import { readFileSync } from 'node:fs';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * Who is coming, and who is let go — from the desk.
 *
 * The activities screen counted sign-ups and offered them as Excel; it
 * could not name them, and an organiser asked to cancel on a guest's
 * behalf had to find the guest in the participants list and cancel the
 * whole conference. Now each activity has a window: the people who hold
 * a place, the two ways to reach each of them, when they signed up, a
 * search, the addresses as one line for an email, the same Excel file —
 * and, for those who govern registrations, a button that gives one
 * guest's place back through the same engine the guest's own
 * cancellation uses.
 */
const read = (file: string) => readFileSync(file, 'utf8');

/* ---------- the release itself, through the engine ---------- */
interface Row {
  id: string;
  eventSlug: string;
  title: string;
  capacity: number | null;
  waitlistEnabled: boolean;
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
};

vi.mock('@/features/registration', () => ({
  /* Nobody is signed in at the desk's side of the call — the organiser names the guest. */
  currentParticipant: async () => null,
}));
vi.mock('@/features/access', () => ({ staffRoleOf: async () => null }));
vi.mock('@/foundation/event-bus', () => ({
  emitRegistration: async (event: { type: string; participantId: string }) => {
    state.events.push(`${event.type}:${event.participantId}`);
  },
}));
vi.mock('@/features/program/services/session-change-notices', () => ({
  announceSessionCancelled: async () => undefined,
  announceSessionChange: async () => undefined,
}));
vi.mock('@/infrastructure', () => ({
  staffOnlyConferenceSlug: async () => null,
  notificationOutbox: { enqueue: async () => undefined },
  sessionRepository: {
    getById: async (id: string) => {
      const row = state.sessions.find((entry) => entry.id === id);
      return row ? { ...row } : null;
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

let releaseWorkshopPlace: typeof import('@/features/program/services/program-service').releaseWorkshopPlace;

beforeAll(async () => {
  ({ releaseWorkshopPlace } = await import('@/features/program/services/program-service'));
});

const reg = (id: string, participantId: string, status: string, waitlistPosition: number | null = null): Reg => ({
  id,
  sessionId: 's1',
  participantId,
  status,
  waitlistPosition,
});

describe('the organiser gives a place back', () => {
  beforeEach(() => {
    state.sessions = [{ id: 's1', eventSlug: 'summit', title: 'Workshop', capacity: 1, waitlistEnabled: true }];
    state.regs = [];
    state.events = [];
  });

  it('cancels the named guest’s place, tells the guest, and moves the next in line up', async () => {
    state.regs = [reg('r1', 'p1', 'confirmed'), reg('r2', 'p2', 'waitlisted', 1)];
    const outcome = await releaseWorkshopPlace('s1', 'p1', 'he');
    expect(outcome?.status).toBe('cancelled');
    expect(state.regs.map((r) => `${r.participantId}:${r.status}`)).toEqual(['p1:cancelled', 'p2:confirmed']);
    expect(state.events).toEqual(['registration.cancelled:p1', 'registration.promoted:p2']);
  });

  it('is not held by the activity’s cancellation deadline — that binds the guest, not the desk', async () => {
    state.sessions = [
      { id: 's1', eventSlug: 'summit', title: 'Workshop', capacity: 1, waitlistEnabled: true, allowCancellation: false, cancellationDeadline: '2020-01-01T00:00:00.000Z' },
    ];
    state.regs = [reg('r1', 'p1', 'confirmed')];
    const outcome = await releaseWorkshopPlace('s1', 'p1', 'he');
    expect(outcome?.status).toBe('cancelled');
  });

  it('lets a waiting guest go without touching the seats', async () => {
    state.regs = [reg('r1', 'p1', 'confirmed'), reg('r2', 'p2', 'waitlisted', 1), reg('r3', 'p3', 'waitlisted', 2)];
    await releaseWorkshopPlace('s1', 'p2', 'he');
    expect(state.regs.map((r) => `${r.participantId}:${r.status}`)).toEqual(['p1:confirmed', 'p2:cancelled', 'p3:waitlisted']);
    expect(state.events).toEqual(['registration.cancelled:p2']);
  });

  it('has nothing to release for a guest who is not there, or who already came', async () => {
    state.regs = [reg('r1', 'p1', 'attended')];
    expect(await releaseWorkshopPlace('s1', 'p9', 'he')).toBeNull();
    expect(await releaseWorkshopPlace('s1', 'p1', 'he')).toBeNull();
    expect(state.regs[0]?.status).toBe('attended');
    expect(state.events).toEqual([]);
  });
});

/* ---------- the door, and the window ---------- */
describe('the actions behind the window', () => {
  const actions = read('src/app/(studio)/studio/(console)/activity/actions.ts');

  it('show the list to those who may see participants, and release only for those who govern registrations', () => {
    expect(actions).toContain("requireCapability('participants:read', slug)");
    expect(actions).toContain("actorFor('registrations:manage', slug)");
  });

  it('take only ids of ours, and release only a guest who is on this activity’s own list', () => {
    expect(actions).toContain('const RECORD_ID = /^\\d{1,12}$/;');
    expect(actions).toContain('RECORD_ID.test(sessionId)');
    expect(actions).toContain('RECORD_ID.test(participantId)');
    expect(actions).toContain('before?.people.find((entry) => entry.participantId === participantId)');
  });

  it('write the release into the history, with who was let go and what they held', () => {
    expect(actions).toContain("'registration.cancelled'");
    expect(actions).toContain('byOrganiser: true');
    expect(actions).toContain("revalidatePath('/studio/activity')");
  });
});

describe('the list', () => {
  const adapter = read('src/infrastructure/payload/payload-activity-roster.ts');
  const dialog = read('src/app/(studio)/studio/(console)/activity/registrants-dialog.tsx');
  const manager = read('src/app/(studio)/studio/(console)/activity/activity-manager.tsx');
  const page = read('src/app/(studio)/studio/(console)/activity/page.tsx');

  it('names the account each place belongs to, and when it was taken', () => {
    expect(adapter).toContain('participantId,');
    expect(adapter).toContain("...(place.submittedAt ? { registeredAt: place.submittedAt } : {})");
  });

  it('opens from every activity, for the roles that may see participants', () => {
    expect(manager).toContain('release: boolean;');
    expect(page).toContain("release: can(access.grants, 'registrations:manage', slug ?? undefined)");
    expect(manager).toContain('aria-haspopup="dialog"');
    expect(manager).toContain('<RegistrantsDialog');
    expect(manager).toContain('canRelease={can.release}');
  });

  it('is a real modal: focus held, Escape closes, a click outside closes', () => {
    expect(dialog).toContain('<dialog');
    expect(dialog).toContain('dialog.showModal()');
    expect(dialog).toContain('onClose={onClose}');
    expect(dialog).toContain('if (event.target === ref.current) onClose();');
    expect(dialog).toContain('aria-labelledby="registrants-title"');
  });

  it('asks before it lets anyone go, and never for a guest who already came', () => {
    expect(dialog).toContain("person.status === 'attended'");
    expect(dialog).toContain('לבטל את ההרשמה של ${name}?');
    expect(dialog).toContain('onClick={() => release(person)}');
    expect(dialog).toContain('aria-live="polite"');
  });

  it('offers the search, the addresses and the same Excel file', () => {
    expect(dialog).toContain('type="search"');
    expect(dialog).toContain('navigator.clipboard.writeText(addresses.join(\', \'))');
    expect(dialog).toContain('/studio/activity/roster?session=${encodeURIComponent(sessionId)}');
  });

  it('says it all in both languages', () => {
    expect(dialog).toContain("locale === 'he' ? 'ביטול הרשמה' : 'Cancel registration'");
    expect(dialog).toContain("locale === 'he' ? 'העתקת כל האימיילים' : 'Copy all emails'");
    expect(dialog).toContain("locale === 'he' ? 'מועד ההרשמה' : 'Registered on'");
  });
});
