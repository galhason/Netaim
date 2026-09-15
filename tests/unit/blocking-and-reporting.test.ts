import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  BlockedPerson,
  BlockRelations,
  ReportInput,
  ReportRecord,
  ReportStatus,
} from '@/features/networking/types/safety';

/*
 * Blocking and reporting.
 *
 * The rules under test are the ones a harassed guest depends on, and
 * every one of them is a rule about something *not* happening:
 *
 *  1. A block works in both directions. The person who was blocked must
 *     not be able to reach back — a block that only hid one side would
 *     leave the door open the wrong way round.
 *  2. Protection does not wait on bookkeeping. If writing the report
 *     row fails, the block that came with it still stands.
 *  3. Nobody blocks or reports themselves, and a signed-out visitor
 *     cannot report anyone.
 *  4. Every channel the platform owns asks before it opens: connecting,
 *     answering, chatting, proposing a meeting, and reading a contact
 *     card. The last case is the reason the source is inspected as well
 *     as the service — a new channel added later is exactly the kind of
 *     hole that no behavioural test would notice.
 */
interface BlockRow {
  blocker: string;
  blocked: string;
}

const blocks: BlockRow[] = [];
const reports: (ReportInput & { status: ReportStatus })[] = [];

/* Flipped by the case where writing the report row fails. */
const outage = { report: false };

/* Flipped by the signed-out case. */
const identity: { me: { id: string; name: string; email: string } | null } = {
  me: { id: '10', name: 'דנה לוי', email: 'dana@example.org' },
};

const NAMES: Record<string, string> = {
  '10': 'דנה לוי',
  '20': 'יואב כהן',
  '30': 'מיכל ברק',
};

vi.mock('@/infrastructure', () => ({
  blockRepository: {
    create: async (blockerId: string, blockedId: string) => {
      if (
        !blocks.some(
          (row) => row.blocker === blockerId && row.blocked === blockedId,
        )
      ) {
        blocks.push({ blocker: blockerId, blocked: blockedId });
      }
      return true;
    },
    remove: async (blockerId: string, blockedId: string) => {
      const at = blocks.findIndex(
        (row) => row.blocker === blockerId && row.blocked === blockedId,
      );
      if (at >= 0) {
        blocks.splice(at, 1);
      }
      return true;
    },
    relations: async (participantId: string): Promise<BlockRelations> => ({
      blockedByMe: blocks
        .filter((row) => row.blocker === participantId)
        .map((row) => row.blocked),
      blockedMe: blocks
        .filter((row) => row.blocked === participantId)
        .map((row) => row.blocker),
    }),
    listBlockedBy: async (participantId: string): Promise<BlockedPerson[]> =>
      blocks
        .filter((row) => row.blocker === participantId)
        .map((row) => ({
          participantId: row.blocked,
          name: NAMES[row.blocked] ?? '',
        })),
  },
  reportRepository: {
    create: async (input: ReportInput) => {
      if (outage.report) {
        throw new Error('database unreachable');
      }
      reports.push({ ...input, status: 'open' });
      return true;
    },
    list: async (): Promise<ReportRecord[]> => [],
    setStatus: async () => true,
    countOpen: async () =>
      reports.filter((row) => row.status === 'open').length,
  },
}));

vi.mock('@/features/registration', () => ({
  currentParticipant: async () => identity.me,
}));

const {
  blockParticipant,
  blockedBetween,
  myBlockedPeople,
  myHiddenParticipantIds,
  reportParticipant,
  unblockParticipant,
} = await import('@/features/networking/services/safety-service');

beforeEach(() => {
  blocks.length = 0;
  reports.length = 0;
  outage.report = false;
  identity.me = { id: '10', name: 'דנה לוי', email: 'dana@example.org' };
});

describe('a block closes the door in both directions', () => {
  it('hides the person I blocked', async () => {
    await blockParticipant('20');
    const hidden = await myHiddenParticipantIds();
    expect(hidden.has('20')).toBe(true);
    expect(await blockedBetween('10', '20')).toBe(true);
  });

  it('hides the person who blocked me, without telling me which it was', async () => {
    blocks.push({ blocker: '30', blocked: '10' });
    const hidden = await myHiddenParticipantIds();
    expect(hidden.has('30')).toBe(true);
    /* The list I can see is only the one I made myself. */
    expect(await myBlockedPeople()).toEqual([]);
    expect(await blockedBetween('10', '30')).toBe(true);
    expect(await blockedBetween('30', '10')).toBe(true);
  });

  it('leaves everyone else reachable', async () => {
    await blockParticipant('20');
    expect(await blockedBetween('10', '30')).toBe(false);
    expect((await myHiddenParticipantIds()).has('30')).toBe(false);
  });

  it('blocking twice is the same decision, and unblocking reopens', async () => {
    await blockParticipant('20');
    await blockParticipant('20');
    expect(blocks).toHaveLength(1);
    await unblockParticipant('20');
    expect(await blockedBetween('10', '20')).toBe(false);
  });

  it('refuses to block myself', async () => {
    await blockParticipant('10');
    expect(blocks).toEqual([]);
  });
});

describe('reporting', () => {
  it('records the report and the block that came with it', async () => {
    const outcome = await reportParticipant({
      targetId: '20',
      reason: 'harassment',
      details: 'שלח הודעות חוזרות אחרי שביקשתי להפסיק',
      alsoBlock: true,
    });
    expect(outcome).toBe('sent');
    expect(reports).toHaveLength(1);
    expect(reports[0]?.reportedId).toBe('20');
    expect(reports[0]?.alsoBlocked).toBe(true);
    expect(await blockedBetween('10', '20')).toBe(true);
  });

  it('keeps the block when the report itself fails to record', async () => {
    outage.report = true;
    const outcome = await reportParticipant({
      targetId: '20',
      reason: 'harassment',
      alsoBlock: true,
    });
    expect(outcome).toBe('failed');
    expect(
      await blockedBetween('10', '20'),
      'protection must not wait on bookkeeping',
    ).toBe(true);
  });

  it('reports without blocking when that is what was asked', async () => {
    await reportParticipant({
      targetId: '20',
      reason: 'spam',
      alsoBlock: false,
    });
    expect(reports).toHaveLength(1);
    expect(await blockedBetween('10', '20')).toBe(false);
  });

  it('refuses a report of myself, and one from nobody', async () => {
    expect(
      await reportParticipant({
        targetId: '10',
        reason: 'other',
        alsoBlock: false,
      }),
    ).toBe('invalid');
    identity.me = null;
    expect(
      await reportParticipant({
        targetId: '20',
        reason: 'other',
        alsoBlock: false,
      }),
    ).toBe('signedOut');
    expect(reports).toEqual([]);
  });
});

/*
 * A block is only worth as much as the number of channels that consult
 * it. These read the sources, because the failure they guard against is
 * a channel that simply never asks.
 */
const source = (file: string): string => readFileSync(file, 'utf8');

describe('every channel asks before it opens', () => {
  it('gates connecting, answering, channels and the contact card', () => {
    const text = source('src/features/networking/services/connection-service.ts');
    for (const fn of [
      'requestConnection',
      'respondToRequest',
      'connectionChannels',
      'connectionContactCard',
      'connectToParticipant',
    ]) {
      const body = text.slice(text.indexOf(`export const ${fn}`));
      const scoped = body.slice(0, body.indexOf('\nexport const '));
      expect(
        scoped.includes('blockedBetween'),
        `${fn} must refuse a blocked pair`,
      ).toBe(true);
    }
  });

  it('keeps blocked people out of the list of my connections', () => {
    const text = source('src/features/networking/services/connection-service.ts');
    expect(text.includes('myHiddenParticipantIds')).toBe(true);
  });

  it('gates chat and meeting proposals', () => {
    expect(
      source('src/features/networking/services/chat-service.ts').includes(
        'blockedBetween',
      ),
    ).toBe(true);
    expect(
      source('src/features/networking/services/meeting-service.ts').includes(
        'blockedBetween',
      ),
    ).toBe(true);
  });

  it('keeps blocked people out of the directory the community page renders', () => {
    const page = source('src/app/(frontend)/[locale]/me/networking/page.tsx');
    expect(page.includes('myHiddenParticipantIds')).toBe(true);
  });

  it('lets only the team read reports, and never through the guest surface', () => {
    const collection = source('src/cms/collections/networking-reports.ts');
    expect(collection.includes('moderationAccess')).toBe(true);
    const presets = source('src/cms/access-presets.ts');
    const block = presets.slice(presets.indexOf('export const moderationAccess'));
    const scoped = block.slice(0, block.indexOf('\n};') + 3);
    expect(scoped.includes('create: denied')).toBe(true);
    expect(scoped.includes('update: denied')).toBe(true);
    expect(scoped.includes('delete: denied')).toBe(true);
  });

  it('checks the capability before the Studio moves a report', () => {
    const actions = source('src/app/(studio)/studio/(console)/reports/actions.ts');
    expect(actions.includes("actorFor('participants:manage')")).toBe(true);
    expect(actions.includes("'safety.reportHandled'")).toBe(true);
  });
});
