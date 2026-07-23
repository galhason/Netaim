import type { CollectionConfig } from 'payload';
import { scopedByOrganization, scopedCreate } from '../access';

/*
 * Studio access as data (Identity Architecture §3): a role granted to a
 * platform account, optionally scoped to one conference. `event: null`
 * means platform-wide. Readable and writable only with platform:manage —
 * never public. The derived technical principal in `users` moves with
 * rows here automatically; nobody edits either by hand.
 */
export const AccountGrants: CollectionConfig = {
  slug: 'account-grants',
  admin: {
    group: 'Platform',
    useAsTitle: 'role',
  },
  access: {
    read: scopedByOrganization('platform:manage'),
    create: scopedCreate('platform:manage'),
    update: scopedByOrganization('platform:manage'),
    delete: scopedByOrganization('platform:manage'),
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
      name: 'account',
      type: 'relationship',
      relationTo: 'participants',
      required: true,
      index: true,
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      options: [
        { label: 'Owner', value: 'owner' },
        { label: 'Producer', value: 'producer' },
        { label: 'Editor', value: 'editor' },
        { label: 'Door', value: 'door' },
        { label: 'Viewer', value: 'viewer' },
      ],
    },
    {
      name: 'event',
      type: 'relationship',
      relationTo: 'events',
      admin: {
        description: 'Scope the grant to one conference. Empty = platform-wide.',
      },
    },
    {
      name: 'grantedBy',
      type: 'relationship',
      relationTo: 'participants',
    },
    {
      name: 'grantedAt',
      type: 'date',
    },
  ],
};
