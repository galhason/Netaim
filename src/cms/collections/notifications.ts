import type { CollectionConfig } from 'payload';
import { registrationAccess } from '../access-presets';

/*
 * The Notification outbox (Platform-Engines §2.10). The engine never
 * sends inside a domain transaction; it enqueues here and a channel
 * adapter delivers. In development the dev channel records the message;
 * a real provider swaps the adapter at deployment.
 */
export const Notifications: CollectionConfig = {
  slug: 'notifications',
  access: registrationAccess,
  admin: {
    group: 'System',
    useAsTitle: 'subject',
    defaultColumns: ['type', 'status', 'subject'],
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
      name: 'participant',
      type: 'relationship',
      relationTo: 'participants',
    },
    {
      name: 'event',
      type: 'relationship',
      relationTo: 'events',
    },
    {
      name: 'type',
      type: 'text',
      required: true,
    },
    {
      name: 'channel',
      type: 'select',
      required: true,
      defaultValue: 'email',
      options: [{ label: 'Email', value: 'email' }],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'queued',
      options: [
        { label: 'Queued', value: 'queued' },
        { label: 'Sent', value: 'sent' },
        { label: 'Failed', value: 'failed' },
      ],
    },
    {
      name: 'locale',
      type: 'text',
    },
    {
      name: 'subject',
      type: 'text',
    },
    {
      name: 'body',
      type: 'textarea',
    },
    {
      name: 'sentAt',
      type: 'date',
    },
  ],
};
