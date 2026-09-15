import { cache } from 'react';
import { blockRepository, reportRepository } from '@/infrastructure';
import { checkRateLimit } from '@/features/access';
import { currentParticipant } from '@/features/registration';
import type {
  BlockedPerson,
  BlockRelations,
  ReportReason,
  ReportRecord,
  ReportStatus,
} from '../types/safety';

/*
 * Blocking and reporting.
 *
 * A guest could mute a conversation or remove a connection, and neither
 * helps someone who is being harassed: mute is private and reversible,
 * remove leaves the pair free to start again. These two acts are the
 * answer, and they are deliberately different from each other.
 *
 * **Blocking is unilateral, silent and total.** It needs no agreement,
 * the other side is never told, and it closes every channel this
 * platform owns — in both directions, because a block that only worked
 * one way would leave the blocked person able to keep arriving.
 *
 * **Reporting reaches the organizers.** It is the only one of the two
 * that can act on a pattern, because only the team can see that three
 * people reported the same account.
 *
 * Neither reads as proof to the other side. A blocked person sees the
 * connection quietly gone — the same thing they would see had it been
 * removed — because a screen that says "you have been blocked" is a
 * message from the person who wanted no more messages.
 */
const MAX_DETAILS = 1000;

export const blockParticipant = async (targetId: string): Promise<boolean> => {
  const me = await currentParticipant();
  if (!me || !targetId || targetId === me.id) {
    return false;
  }
  return blockRepository.create(me.id, targetId);
};

export const unblockParticipant = async (
  targetId: string,
): Promise<boolean> => {
  const me = await currentParticipant();
  if (!me || !targetId) {
    return false;
  }
  return blockRepository.remove(me.id, targetId);
};

export const myBlockedPeople = async (): Promise<BlockedPerson[]> => {
  const me = await currentParticipant();
  if (!me) {
    return [];
  }
  return blockRepository.listBlockedBy(me.id).catch(() => []);
};

/*
 * Every id this guest must not meet: the ones they blocked and the ones
 * who blocked them, in one set, for the filters that build a page.
 */
/*
 * Who this person may not meet, read once per request.
 *
 * Both questions below — "hide these from the page" and "may these two
 * interact" — are the same row set, and a page that draws a dozen
 * connection tiles asked for it a dozen times. `cache` is
 * request-scoped, so the second ask inside one render is free and the
 * next request still reads a block placed a second ago.
 */
const relationsOf = cache(
  async (id: string): Promise<BlockRelations> =>
    blockRepository
      .relations(id)
      .catch((): BlockRelations => ({ blockedByMe: [], blockedMe: [] })),
);

export const myHiddenParticipantIds = async (): Promise<Set<string>> => {
  const me = await currentParticipant();
  if (!me) {
    return new Set();
  }
  const relations = await relationsOf(me.id);
  return new Set([...relations.blockedByMe, ...relations.blockedMe]);
};

/*
 * The gate every interaction asks before it acts. Takes both ids so it
 * can be called about a pair the caller is not part of — the studio
 * never needs it, but a service acting on a connection does.
 */
export const blockedBetween = async (
  a: string,
  b: string,
): Promise<boolean> => {
  if (!a || !b) {
    return false;
  }
  const relations = await relationsOf(a);
  return relations.blockedByMe.includes(b) || relations.blockedMe.includes(b);
};

export type ReportOutcome = 'sent' | 'signedOut' | 'invalid' | 'failed';

export const reportParticipant = async (input: {
  targetId: string;
  reason: ReportReason;
  details?: string;
  eventSlug?: string;
  alsoBlock: boolean;
}): Promise<ReportOutcome> => {
  const me = await currentParticipant();
  if (!me) {
    return 'signedOut';
  }
  if (!input.targetId || input.targetId === me.id) {
    return 'invalid';
  }
  /*
   * The block happens first and stands on its own. If the report fails
   * to record — or is refused by the throttle below — the person is
   * still not reachable. Protection must never wait on bookkeeping,
   * and it is never rate-limited: someone in distress who has already
   * filed today must still be able to make the harasser disappear.
   */
  if (input.alsoBlock) {
    await blockRepository.create(me.id, input.targetId).catch(() => false);
  }
  /*
   * Only the filing itself is paced, and generously: enough that nobody
   * with a real complaint is turned away, narrow enough that reports
   * cannot be produced in bulk to bury a person under a queue.
   */
  const pace = await checkRateLimit('report', me.id);
  if (!pace.allowed) {
    return 'failed';
  }
  const written = await reportRepository
    .create({
      reporterId: me.id,
      reportedId: input.targetId,
      eventSlug: input.eventSlug,
      reason: input.reason,
      details: input.details?.trim().slice(0, MAX_DETAILS) || undefined,
      alsoBlocked: input.alsoBlock,
    })
    .catch(() => false);
  return written ? 'sent' : 'failed';
};

/*
 * The team's side. Authorization belongs to the caller — these are
 * reached only from Studio actions that have already proven the
 * capability.
 */
export const listReports = (): Promise<ReportRecord[]> =>
  reportRepository.list();

export const countOpenReports = (): Promise<number> =>
  reportRepository.countOpen().catch(() => 0);

export const setReportStatus = (
  id: string,
  status: ReportStatus,
  handler: { id: string; name: string },
): Promise<boolean> => reportRepository.setStatus(id, status, handler);
