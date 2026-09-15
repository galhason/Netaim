import type { CollectionConfig } from 'payload';
import { registrationAccess } from '../access-presets';

/*
 * One guest's decision not to be reachable by another.
 *
 * Muting silences a conversation; removing ends a relationship. Neither
 * answers the person who is being harassed, and a public body will ask
 * what does — so this is the third act, and it is unilateral: it needs
 * no agreement from the other side and it is never announced to them.
 *
 * The row is deliberately not a connection with a different status. A
 * block must be possible against someone you never connected with, and
 * it must outlive any connection the pair ever had. It is also not
 * scoped to a conference: a person you do not want to hear from is not
 * someone you want to hear from in the next room.
 *
 * Nothing here is a promise of invisibility — a blocked account can
 * still read a public conference page. What it guarantees is that no
 * channel this platform owns will carry them to you.
 */
export const NetworkingBlocks: CollectionConfig = {
  slug: 'networking-blocks',
  access: registrationAccess,
  admin: {
    group: 'Networking',
    useAsTitle: 'id',
    defaultColumns: ['blocker', 'blocked', 'createdAt'],
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
      name: 'blocker',
      type: 'relationship',
      relationTo: 'participants',
      required: true,
      index: true,
    },
    {
      name: 'blocked',
      type: 'relationship',
      relationTo: 'participants',
      required: true,
      index: true,
    },
  ],
  timestamps: true,
};
