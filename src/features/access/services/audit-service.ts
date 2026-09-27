import { auditRepository } from '@/infrastructure';
import { createLogger } from '@/shared';
import type {
  AuditAction,
  AuditActor,
  AuditEntry,
  AuditEntryInput,
  AuditPage,
  AuditQuery,
} from '../types/audit';

const log = createLogger('audit');

const HISTORY_LIMIT = 200;

/*
 * Records one act. Never throws and never blocks: an audit failure must
 * not undo a launch or refuse a check-in that already happened. It is
 * logged at error level instead, because a trail that silently stops
 * recording is worse than one that is visibly broken.
 *
 * The write is deliberately not awaited by callers on the hot path —
 * `recordAudit` is fire-and-forget from the action's point of view — but
 * the promise is returned so a test can wait for it.
 */
export const recordAudit = async (entry: AuditEntryInput): Promise<void> => {
  try {
    await auditRepository.record(entry);
  } catch (error) {
    log.error('failed to record', {
      action: entry.action,
      subject: entry.subject ?? '',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/*
 * The shape an action uses: it already holds the actor from its
 * capability check, so recording costs one call and cannot attribute
 * the act to the wrong person.
 */
export const audit = (
  actor: AuditActor,
  action: AuditAction,
  subject?: string,
  detail?: AuditEntryInput['detail'],
  subjectLabel?: string,
): Promise<void> =>
  recordAudit({ action, actor, subject, subjectLabel, detail });

export const eventHistory = (subject: string): Promise<AuditEntry[]> =>
  auditRepository.list({ subject, limit: HISTORY_LIMIT }).catch(() => []);

export const platformHistory = (): Promise<AuditEntry[]> =>
  auditRepository.list({ limit: HISTORY_LIMIT }).catch(() => []);

/* The full log, filtered and paged — the admin's view and export. */
export const queryAudit = (query: AuditQuery): Promise<AuditPage> =>
  auditRepository.query(query).catch(() => ({ entries: [], total: 0, page: 1, pages: 0 }));

/*
 * Everything that matches, for an export: pages walked to the end,
 * capped so a runaway filter cannot pull the whole table into memory.
 */
export const EXPORT_CAP = 20_000;

export const exportAudit = async (query: Omit<AuditQuery, 'limit' | 'page'>): Promise<AuditEntry[]> => {
  const out: AuditEntry[] = [];
  let page = 1;
  for (;;) {
    const chunk = await auditRepository.query({ ...query, limit: 500, page });
    out.push(...chunk.entries);
    if (chunk.page >= chunk.pages || out.length >= EXPORT_CAP) {
      break;
    }
    page += 1;
  }
  return out.slice(0, EXPORT_CAP);
};
