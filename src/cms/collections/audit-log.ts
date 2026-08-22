import type { CollectionConfig } from 'payload';
import { auditAccess } from '../access-presets';

/*
 * Who did what, when. A government or enterprise buyer treats this as
 * table stakes, and until now the platform could not answer the
 * question at all: a conference could be launched, a registration
 * declined or a role granted with no record of the hand that did it.
 *
 * Entries are append-only. There is no update and no delete access —
 * not for an owner, not for the platform — because a trail that can be
 * edited is not a trail. Retention is a sweep, not an edit.
 */
export const AuditLog: CollectionConfig = {
  slug: 'audit-log',
  access: auditAccess,
  admin: {
    group: 'Platform',
    useAsTitle: 'action',
    defaultColumns: ['action', 'actorEmail', 'subject', 'createdAt'],
    hidden: true,
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
      /* What happened, as a stable dotted name: `event.launched`. */
      name: 'action',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'actor',
      type: 'relationship',
      relationTo: 'participants',
      index: true,
    },
    {
      /*
       * Denormalised on purpose. An account can be renamed, anonymised
       * under GDPR, or deleted; the trail must still say who acted at
       * the time, so the identity is captured as it read then.
       */
      name: 'actorName',
      type: 'text',
    },
    {
      name: 'actorEmail',
      type: 'text',
      index: true,
    },
    {
      /* What it was done to, in product language: a conference slug. */
      name: 'subject',
      type: 'text',
      index: true,
    },
    {
      name: 'subjectLabel',
      type: 'text',
    },
    {
      /*
       * Anything else worth remembering about this one act. Deliberately
       * free-form and deliberately small: never a request body, never a
       * password, never a token.
       */
      name: 'detail',
      type: 'json',
    },
  ],
  timestamps: true,
};
