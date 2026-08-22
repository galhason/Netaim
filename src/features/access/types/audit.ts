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

  /* People at the door */
  'registration.approved',
  'registration.declined',
  'registration.cancelled',
  'registration.promoted',
  'registration.checkedIn',
  'participant.blocked',
  'participant.deleted',

  /* Who may do what */
  'grant.granted',
  'grant.revoked',

  /* Reaching the audience */
  'communication.broadcast',
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

export interface AuditRepository {
  record: (entry: AuditEntryInput) => Promise<void>;
  /* Newest first. `subject` narrows to one conference. */
  list: (options: {
    subject?: string;
    limit: number;
  }) => Promise<AuditEntry[]>;
}
