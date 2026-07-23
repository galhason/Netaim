import type { CollectionConfig } from 'payload';
import { registrationAccess } from '../access-presets';

/*
 * A NetworkingConnection is a directed request between two participants at
 * an event (Networking-Architecture Layer 2). The state machine lives in
 * the pure engine; this collection only persists the current status. At
 * most one active (pending/accepted) connection exists per pair — enforced
 * by the application layer at the seam.
 */
export const NetworkingConnections: CollectionConfig = {
  slug: 'networking-connections',
  access: registrationAccess,
  admin: {
    group: 'Networking',
    useAsTitle: 'id',
    defaultColumns: ['requester', 'addressee', 'status'],
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
      name: 'event',
      type: 'relationship',
      relationTo: 'events',
      required: true,
      index: true,
    },
    {
      name: 'requester',
      type: 'relationship',
      relationTo: 'participants',
      required: true,
      index: true,
    },
    {
      name: 'addressee',
      type: 'relationship',
      relationTo: 'participants',
      required: true,
      index: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Accepted', value: 'accepted' },
        { label: 'Declined', value: 'declined' },
        { label: 'Muted', value: 'muted' },
        { label: 'Removed', value: 'removed' },
      ],
    },
    {
      /*
       * Who muted (Connection Framework v1.0): mute is private — the
       * other side keeps seeing an ordinary connection, and only the
       * muter may unmute.
       */
      name: 'mutedBy',
      type: 'text',
    },
    {
      name: 'message',
      type: 'textarea',
    },
  ],
};
