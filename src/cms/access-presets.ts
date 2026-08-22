import type { CollectionConfig } from 'payload';
import { isPublic, scopedByOrganization, scopedCreate } from './access';

/*
 * The three access shapes of the platform, declared once (Objective 5:
 * no scattered permission checks). Published content stays publicly
 * readable; drafts, mutations and people data are organization-scoped
 * through the single grants resolver.
 */
export const publicContentAccess: CollectionConfig['access'] = {
  read: isPublic,
  readVersions: scopedByOrganization('content:read'),
  create: scopedCreate('content:write'),
  update: scopedByOrganization('content:write'),
  delete: scopedByOrganization('content:launch'),
};

export const orgContentAccess: CollectionConfig['access'] = {
  read: isPublic,
  create: scopedCreate('content:write'),
  update: scopedByOrganization('content:write'),
  delete: scopedByOrganization('content:write'),
};

export const registrationAccess: CollectionConfig['access'] = {
  read: scopedByOrganization('registrations:read'),
  create: scopedCreate('registrations:manage'),
  update: scopedByOrganization('registrations:manage'),
  delete: scopedByOrganization('registrations:manage'),
};

/*
 * Platform machinery with no organization and no CMS reader: abuse
 * counters and other operational state. Closed to everyone through the
 * access layer; the services that own it write with overrideAccess at
 * the infrastructure seam, exactly as the participant repositories do.
 */
const denied = (): boolean => false;

export const platformOnlyAccess: CollectionConfig['access'] = {
  read: denied,
  create: denied,
  update: denied,
  delete: denied,
};

/*
 * The audit trail: readable by anyone who may see the organization's
 * people data, and otherwise append-only. Update and delete are denied
 * outright — a record that can be rewritten proves nothing, and that
 * holds for an owner as much as for anyone else. Entries are written
 * through the system seam, which bypasses this layer by design; the
 * closed create keeps the CMS from being a second way in.
 */
export const auditAccess: CollectionConfig['access'] = {
  read: scopedByOrganization('registrations:read'),
  create: denied,
  update: denied,
  delete: denied,
};
