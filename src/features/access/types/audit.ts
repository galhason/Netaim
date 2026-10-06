/*
 * The vocabulary of the trail. A closed union rather than free strings:
 * a typo in an action name silently creates a category nobody queries,
 * and the history tab would quietly stop showing a kind of event.
 */
export const AUDIT_ACTIONS = [
  /* A conference's life */
  'event.created',
  'event.duplicated',
  'event.launched',
  'event.archived',
  'event.restored',
  'event.deleted',
  'event.activeConferenceChanged',

  /* Published content */
  'content.composerSaved',
  'content.openingSaved',
  'content.venueSaved',
  'content.homepageSaved',
  'content.sessionCreated',
  'content.sessionUpdated',
  'content.sessionDeleted',
  'content.sessionArchived',
  'content.sessionRestored',
  'content.speakerSaved',
  'content.speakerRemoved',
  'content.partnerSaved',
  'content.partnerRemoved',
  'content.partnersReordered',
  'content.galleryItemSaved',
  'content.galleryItemRemoved',
  'content.galleryReordered',
  'content.gallerySubmissionApproved',
  'content.gallerySubmissionRejected',
  'audit.exported',

  /* People at the door */
  'registration.approved',
  'registration.declined',
  'registration.cancelled',
  'registration.promoted',
  'registration.checkedIn',
  'registration.rosterExported',
  'participant.blocked',
  'participant.deleted',

  /* Safety */
  'safety.reportHandled',

  /* Who may do what */
  'grant.granted',
  'grant.revoked',

  /* Reaching the audience */
  'communication.broadcast',

  /* The system page */
  'system.updatePublished',
  'system.updateEdited',
  'system.updateRemoved',

  /* Forgetting, on schedule */
  'privacy.retentionPurge',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface AuditActor {
  id: string;
  name: string;
  email: string;
}

export interface AuditEntryInput {
  action: AuditAction;
  actor: AuditActor;
  /* The conference slug, or another stable identifier. */
  subject?: string;
  subjectLabel?: string;
  detail?: Record<string, string | number | boolean | null>;
}

export interface AuditEntry {
  id: string;
  action: string;
  actorName: string;
  actorEmail: string;
  subject: string;
  subjectLabel: string;
  detail: Record<string, unknown> | null;
  at: string;
}

/*
 * How the log is asked for: by conference, by person, by kind of act,
 * by time — and in pages, because a log is the one list that only
 * grows. Every filter is optional; the page is one-based.
 */
export interface AuditQuery {
  subject?: string;
  actorEmail?: string;
  action?: string;
  from?: string;
  to?: string;
  limit: number;
  page?: number;
}

export interface AuditPage {
  entries: AuditEntry[];
  total: number;
  page: number;
  pages: number;
}

export interface AuditRepository {
  record: (entry: AuditEntryInput) => Promise<void>;
  /* Newest first. `subject` narrows to one conference. */
  list: (options: {
    subject?: string;
    limit: number;
  }) => Promise<AuditEntry[]>;
  query: (options: AuditQuery) => Promise<AuditPage>;
}
