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
