import type { CollectionConfig } from 'payload';
import { platformOnly, scopedSelfOrganization } from '../access';

/*
 * Tenancy root (Domain Blueprint section 1). Members see only their own
 * organizations; creating or removing organizations is platform-scope.
 */
export const Organizations: CollectionConfig = {
  slug: 'organizations',
  admin: {
    group: 'Platform',
    useAsTitle: 'name',
  },
  access: {
    read: scopedSelfOrganization('content:read'),
    create: platformOnly('platform:manage'),
    update: scopedSelfOrganization('settings:manage'),
    delete: platformOnly('platform:manage'),
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
  ],
};
