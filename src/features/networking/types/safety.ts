/*
 * Blocking and reporting — the two acts a guest has when a connection
 * is not the problem but a person is. The repositories speak
 * participant ids; who may call them is the service's law.
 */
export interface BlockedPerson {
  participantId: string;
  name: string;
}

/*
 * Both directions in one read. A block is symmetric in effect even
 * though it is one person's decision: neither side reaches the other,
 * and every filter needs the union.
 */
export interface BlockRelations {
  blockedByMe: string[];
  blockedMe: string[];
}

export interface BlockRepository {
  create: (blockerId: string, blockedId: string) => Promise<boolean>;
  remove: (blockerId: string, blockedId: string) => Promise<boolean>;
  relations: (participantId: string) => Promise<BlockRelations>;
  listBlockedBy: (participantId: string) => Promise<BlockedPerson[]>;
}

export const REPORT_REASON_VALUES = [
  'harassment',
  'spam',
  'impersonation',
  'inappropriate',
  'other',
] as const;

export type ReportReason = (typeof REPORT_REASON_VALUES)[number];

export const isReportReason = (value: string): value is ReportReason =>
  (REPORT_REASON_VALUES as readonly string[]).includes(value);

export const REPORT_STATUS_VALUES = [
  'open',
  'reviewing',
  'resolved',
  'dismissed',
] as const;

export type ReportStatus = (typeof REPORT_STATUS_VALUES)[number];

export const isReportStatus = (value: string): value is ReportStatus =>
  (REPORT_STATUS_VALUES as readonly string[]).includes(value);

export interface ReportInput {
  reporterId: string;
  reportedId: string;
  eventSlug?: string;
  reason: ReportReason;
  details?: string;
  alsoBlocked: boolean;
}

export interface ReportRecord {
  id: string;
  reporterName: string;
  reporterEmail: string;
  reportedId: string;
  reportedName: string;
  reportedEmail: string;
  eventSlug?: string;
  reason: ReportReason;
  details?: string;
  status: ReportStatus;
  handledByName?: string;
  handledAt?: string;
  alsoBlocked: boolean;
  createdAt?: string;
}

export interface ReportRepository {
  create: (input: ReportInput) => Promise<boolean>;
  list: () => Promise<ReportRecord[]>;
  setStatus: (
    id: string,
    status: ReportStatus,
    handler: { id: string; name: string },
  ) => Promise<boolean>;
  countOpen: () => Promise<number>;
}
