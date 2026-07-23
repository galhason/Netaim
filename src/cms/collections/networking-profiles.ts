import type { CollectionConfig } from 'payload';
import { registrationAccess } from '../access-presets';

/*
 * A NetworkingProfile is a participant's opt-in presence at an event
 * (Networking-Architecture Layer 1). One profile per (event, participant).
 * Only `visible` profiles appear in the public directory; the profile is
 * authored by the participant, never by staff.
 */
export const NetworkingProfiles: CollectionConfig = {
  slug: 'networking-profiles',
  access: registrationAccess,
  admin: {
    group: 'Networking',
    useAsTitle: 'headline',
    defaultColumns: ['headline', 'visible', 'availableForMeetings'],
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
      name: 'participant',
      type: 'relationship',
      relationTo: 'participants',
      required: true,
      index: true,
    },
    {
      name: 'headline',
      type: 'text',
    },
    {
      name: 'bio',
      type: 'textarea',
    },
    {
      name: 'interests',
      type: 'text',
    },
    {
      name: 'links',
      type: 'array',
      fields: [
        { name: 'label', type: 'text' },
        { name: 'url', type: 'text' },
      ],
    },
    {
      name: 'visible',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'availableForMeetings',
      type: 'checkbox',
      defaultValue: false,
    },
  ],
};
