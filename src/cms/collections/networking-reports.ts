import type { CollectionConfig } from 'payload';
import { moderationAccess } from '../access-presets';

/*
 * What one guest told the organizers about another.
 *
 * Blocking protects the person who blocks; it tells nobody. A report is
 * the other half: it reaches the team who can act on a pattern — the
 * same account reported by several people is a thing only they can see.
 *
 * Names are copied onto the row beside the relationships, for the same
 * reason the audit trail copies them: an account can be renamed,
 * anonymised or deleted, and a report that then reads "someone reported
 * someone" is evidence of nothing.
 *
 * Guests never write here directly and never read here at all. The
 * service writes through the system seam; the team reads it in the
 * Studio.
 */
export const REPORT_REASONS = [
  'harassment',
  'spam',
  'impersonation',
  'inappropriate',
  'other',
] as const;

export const REPORT_STATUSES = ['open', 'reviewing', 'resolved', 'dismissed'] as const;

export const NetworkingReports: CollectionConfig = {
  slug: 'networking-reports',
  access: moderationAccess,
  admin: {
    group: 'Networking',
    useAsTitle: 'reason',
    defaultColumns: ['reportedName', 'reason', 'status', 'createdAt'],
  },
  fields: [
    {
      name: 'organization',
      type: 'relationship',
      relationTo: 'organizations',
      required: true,
      index: true,
    },
    {
      /* Where it happened, when the pair share a conference. */
      name: 'event',
      type: 'relationship',
      relationTo: 'events',
      index: true,
    },
    {
      name: 'reporter',
      type: 'relationship',
      relationTo: 'participants',
      required: true,
      index: true,
    },
    { name: 'reporterName', type: 'text' },
    { name: 'reporterEmail', type: 'text' },
    {
      name: 'reported',
      type: 'relationship',
      relationTo: 'participants',
      required: true,
      index: true,
    },
    { name: 'reportedName', type: 'text' },
    { name: 'reportedEmail', type: 'text' },
    {
      name: 'reason',
      type: 'select',
      required: true,
      defaultValue: 'other',
      options: REPORT_REASONS.map((value) => ({ label: value, value })),
    },
    { name: 'details', type: 'textarea' },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'open',
      index: true,
      options: REPORT_STATUSES.map((value) => ({ label: value, value })),
    },
    {
      /* Who on the team last moved it, captured as it read then. */
      name: 'handledBy',
      type: 'relationship',
      relationTo: 'participants',
    },
    { name: 'handledByName', type: 'text' },
    { name: 'handledAt', type: 'date' },
    {
      /* Whether the reporter also blocked them in the same act. */
      name: 'alsoBlocked',
      type: 'checkbox',
      defaultValue: false,
    },
  ],
  timestamps: true,
};
