import type { CollectionConfig } from 'payload';
import { registrationAccess } from '../access-presets';

/*
 * HASON Messages, person to person (Connection Framework v1.0): the
 * default channel every accepted connection always has. A message
 * belongs to a connection — never to a bare pair — so severing the
 * connection severs the conversation's future, and privacy needs no
 * extra rule here.
 */
export const NetworkingChatMessages: CollectionConfig = {
  slug: 'networking-chat-messages',
  access: registrationAccess,
  admin: {
    group: 'Networking',
    useAsTitle: 'id',
    defaultColumns: ['connection', 'sender', 'createdAt'],
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
      name: 'connection',
      type: 'relationship',
      relationTo: 'networking-connections',
      required: true,
      index: true,
    },
    {
      name: 'sender',
      type: 'relationship',
      relationTo: 'participants',
      required: true,
      index: true,
    },
    {
      name: 'body',
      type: 'textarea',
      required: true,
    },
    {
      /* set when the other side opened the thread */
      name: 'readAt',
      type: 'date',
    },
  ],
};
