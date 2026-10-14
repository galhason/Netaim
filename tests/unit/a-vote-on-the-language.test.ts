import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * A tour's guide may speak three languages, but the tour is given in
 * one. So the activity names its possible languages, each registrant
 * says which they want when they register, and the organiser reads
 * the tally and decides — which closes the vote.
 *
 * The rules, held on the server: no registration without a language
 * while the vote is open; only a language the activity offers counts;
 * a vote can be changed until it is decided and not after; and the
 * tally is read from the live registrations, per activity.
 */
interface Row {
  id: string;
  eventSlug: string;
  title: string;
  sessionType: string;
  capacity: number | null;
  waitlistEnabled: boolean;
  startsAt?: string;
  endsAt?: string;
  languages?: string[];
  languageVote?: boolean;
  decidedLanguage?: string | null;
}
interface Reg {
  id: string;
  sessionId: string;
  participantId: string;
  status: string;
  waitlistPosition: number | null;
  language?: string | null;
}

const state = {
  sessions: [] as Row[],
  regs: [] as Reg[],
  decided: [] as string[],
};

vi.mock('@/features/registration', () => ({
  currentParticipant: async () => ({ id: 'p1', name: 'Dana', email: 'dana@example.org' }),
}));
vi.mock('@/features/access', () => ({ staffRoleOf: async () => null }));
vi.mock('@/foundation/event-bus', () => ({ emitRegistration: async () => undefined }));
vi.mock('@/features/program/services/session-change-notices', () => ({
  announceSessionCancelled: async () => undefined,
  announceSessionChange: async () => false,
  announceLanguageDecided: async (_slug: string, id: string, _titles: unknown, language: string) => {
    state.decided.push(`${id}:${language}`);
    return true;
  },
}));

const tallyOf = (sessionId: string) => {
  const map = new Map<string, { language: string; confirmed: number; waiting: number }>();
  for (const r of state.regs) {
    if (r.sessionId !== sessionId || r.status === 'cancelled' || !r.language) continue;
    const row = map.get(r.language) ?? { language: r.language, confirmed: 0, waiting: 0 };
    if (r.status === 'waitlisted') row.waiting += 1;
    else row.confirmed += 1;
    map.set(r.language, row);
  }
  return [...map.values()].sort((a, b) => b.confirmed - a.confirmed);
};

vi.mock('@/infrastructure', () => ({
  staffOnlyConferenceSlug: async () => null,
  notificationOutbox: { enqueue: async () => undefined },
  sessionRepository: {
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
    registerParticipant: async (
      sessionId: string,
      participantId: string,
      status: string,
      waitlistPosition: number | null,
      language?: string | null,
    ) => {
      const reg = { id: `r${state.regs.length + 1}`, sessionId, participantId, status, waitlistPosition, language };
      state.regs.push(reg);
      return reg;
    },
    setLanguage: async (id: string, language: string) => {
      const reg = state.regs.find((r) => r.id === id);
      if (reg) reg.language = language;
      return reg ?? null;
    },
    languageTally: async (sessionId: string) => tallyOf(sessionId),
    setStatus: async () => null,
    waitlistForSession: async () => [],
    listForParticipant: async () => [],
  },
}));

const load = () => import('@/features/program/services/program-service');

const tour = (over: Partial<Row> = {}): Row => ({
  id: 't1',
  eventSlug: 'summit',
  title: 'Tour',
  sessionType: 'tour',
  capacity: 20,
  waitlistEnabled: true,
  startsAt: '2027-01-01T09:00:00.000Z',
  endsAt: '2027-01-01T10:00:00.000Z',
  languages: ['he', 'en', 'ru'],
  languageVote: true,
  decidedLanguage: null,
  ...over,
});

describe('a vote on the language', () => {
  beforeEach(() => {
    state.sessions = [];
    state.regs = [];
    state.decided = [];
  });

  it('takes no registration without a language while the vote is open, and only one the tour offers', async () => {
    state.sessions = [tour()];
    const program = await load();
    await expect(program.selectWorkshop('t1', 'he')).rejects.toThrow('language');
    await expect(program.selectWorkshop('t1', 'he', 'fr')).rejects.toThrow('language');
    expect(state.regs).toEqual([]);
    const reg = await program.selectWorkshop('t1', 'he', 'en');
    expect(reg.status).toBe('confirmed');
    expect(state.regs[0]?.language).toBe('en');
  });

  it('asks nothing of an activity without a vote, nor of one already decided', async () => {
    state.sessions = [tour({ id: 'w1', languageVote: false })];
    const program = await load();
    expect((await program.selectWorkshop('w1', 'he')).status).toBe('confirmed');
    expect(state.regs[0]?.language).toBeFalsy();
    state.sessions = [tour({ id: 't2', decidedLanguage: 'ru' })];
    expect((await program.selectWorkshop('t2', 'he')).status).toBe('confirmed');
  });

  it('lets a registrant change their vote until the organiser decides, and not after', async () => {
    state.sessions = [tour()];
    state.regs = [{ id: 'r1', sessionId: 't1', participantId: 'p1', status: 'confirmed', waitlistPosition: null, language: 'he' }];
    const program = await load();
    expect((await program.chooseLanguage('t1', 'he', 'ru')).language).toBe('ru');
    await expect(program.chooseLanguage('t1', 'he', 'de')).rejects.toThrow('language');
    state.sessions[0]!.decidedLanguage = 'en';
    await expect(program.chooseLanguage('t1', 'he', 'he')).rejects.toThrow('Vote closed');
    expect(state.regs[0]?.language).toBe('ru');
  });

  it('counts the vote per activity, seats apart from the waiting list, never a cancelled one', async () => {
    state.sessions = [tour(), tour({ id: 't2' })];
    state.regs = [
      { id: 'r1', sessionId: 't1', participantId: 'a', status: 'confirmed', waitlistPosition: null, language: 'en' },
      { id: 'r2', sessionId: 't1', participantId: 'b', status: 'confirmed', waitlistPosition: null, language: 'en' },
      { id: 'r3', sessionId: 't1', participantId: 'c', status: 'waitlisted', waitlistPosition: 1, language: 'he' },
      { id: 'r4', sessionId: 't1', participantId: 'd', status: 'cancelled', waitlistPosition: null, language: 'ru' },
      { id: 'r5', sessionId: 't2', participantId: 'e', status: 'confirmed', waitlistPosition: null, language: 'ru' },
    ];
    const program = await load();
    expect(await program.languageTally('t1')).toEqual([
      { language: 'en', confirmed: 2, waiting: 0 },
      { language: 'he', confirmed: 0, waiting: 1 },
    ]);
    expect(await program.languageTally('t2')).toEqual([{ language: 'ru', confirmed: 1, waiting: 0 }]);
  });

  it('tells every registrant when the organiser decides — once, on the decision', async () => {
    state.sessions = [tour()];
    const program = await load();
    await program.updateSession('t1', 'he', { decidedLanguage: 'en' });
    await program.updateSession('t1', 'he', { title: 'Tour, renamed' });
    expect(state.decided).toEqual(['t1:en']);
  });

  it('is asked on the way in, and read back where the seat is held', () => {
    const kit = readFileSync('src/features/conference/ui/kit.tsx', 'utf8');
    /* The dialog joins the registration form by id, so the choice travels with the request. */
    expect(kit).toContain('<form id={formId} action={registerAction}');
    expect(kit).toContain("type={askFirst ? 'button' : 'submit'}");
    expect(kit).toContain('export const VoteLine');
    const dialog = readFileSync('src/features/conference/ui/language-dialog.tsx', 'utf8');
    expect(dialog).toContain('name="language"');
    expect(dialog).toContain('form={formId}');
    const wizard = readFileSync('src/app/(studio)/studio/(console)/activity/activity-wizard.tsx', 'utf8');
    expect(wizard).toContain('name="languageVote"');
    expect(wizard).toContain('name="decidedLanguage"');
    /* The migration adds the three columns and nothing else. */
    const migration = readFileSync('src/migrations/20261014_090000_a_vote_on_the_language.ts', 'utf8');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "language_vote" boolean DEFAULT false');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "decided_language"');
    expect(migration).toContain('"session_registrations" ADD COLUMN IF NOT EXISTS "language"');
  });
});
