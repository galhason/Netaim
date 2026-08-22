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
    {
      /*
       * How many times delivery has been tried. A mail relay refusing
       * for a minute must not cost a guest their confirmation, so a
       * failure is retried rather than forgotten — and bounded, so a
       * permanently bad address is not retried forever.
       *
       * Deliberately NOT `required`. This column is added to a table
       * that already holds rows, and a NOT NULL column cannot be added
       * to one unattended — which is why a schema push silently skipped
       * it while creating brand-new tables beside it without trouble.
       * Every reader treats a missing value as zero.
       */
      name: 'attempts',
      type: 'number',
      defaultValue: 0,
      index: true,
    },
    {
      /*
       * Why the last attempt failed, for the operator reading the
       * outbox. Never the recipient's address: this field is visible in
       * the Studio, and an error log full of addresses is a mailing
       * list nobody meant to publish.
       */
      name: 'lastError',
      type: 'text',
    },
  ],
};
