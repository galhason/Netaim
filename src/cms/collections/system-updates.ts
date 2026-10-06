import type { CollectionConfig } from 'payload';
import { platformOnlyAccess } from '../access-presets';
import { SYSTEM_UPDATE_KINDS } from '@/features/system/types/system-update';

/*
 * The system page's record: what was released, in which version, when,
 * and by whom. Platform-wide — it belongs to the product, not to any one
 * organisation or conference.
 *
 * Closed to everyone through the access layer, like the platform's other
 * machinery: the Studio reads it for every Netaim role and writes it for
 * the developer alone, and both decisions are made in the system service
 * before it touches this collection.
 */
export const SystemUpdates: CollectionConfig = {
  slug: 'system-updates',
  access: platformOnlyAccess,
  admin: {
    group: 'Platform',
    useAsTitle: 'version',
    defaultColumns: ['version', 'title', 'kind', 'releasedAt'],
  },
  fields: [
    { name: 'version', type: 'text', required: true, index: true },
    { name: 'title', type: 'text', required: true },
    { name: 'details', type: 'textarea' },
    {
      name: 'kind',
      type: 'select',
      required: true,
      defaultValue: 'feature',
      options: SYSTEM_UPDATE_KINDS.map((kind) => ({ label: kind, value: kind })),
    },
    { name: 'releasedAt', type: 'date', required: true, index: true },
    { name: 'publishedBy', type: 'relationship', relationTo: 'participants' },
  ],
};
