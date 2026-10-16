import type { CollectionConfig } from 'payload';
import { orgContentAccess } from '../access-presets';

/*
 * A Speaker is one person in the organisation's speaker library — one
 * card, whichever conferences they speak at. It is hybrid by design: it
 * may LINK an existing platform account (a participant) and lend that
 * account's identity live, or it may hold its own EXTERNAL details for a
 * guest with no Netaim account. When an account is linked, the manual
 * fields act as overrides — the same account-or-manual pattern the
 * opening speakers already use — so a profile edit propagates to every
 * activity without touching the speaker.
 *
 * A conference's speakers are not stored on the speaker: they are
 * everyone its activities name, read from the sessions, plus the few
 * listed on it by hand (`events`) — a keynote whose slot is not set yet.
 * So one person is one card in every conference, and taking a speaker
 * off every activity takes them off that conference's page.
 */
export const Speakers: CollectionConfig = {
  slug: 'speakers',
  admin: {
    group: 'Content',
    useAsTitle: 'name',
    defaultColumns: ['name', 'company', 'account'],
  },
  access: orgContentAccess,
  fields: [
    {
      name: 'organization',
      type: 'relationship',
      relationTo: 'organizations',
      required: true,
      index: true,
    },
    {
      /* Conferences that list this speaker by hand, beyond the activities
       * that name them — a speaker whose slot is not set yet. A speaker
       * on an activity needs no entry here to be on that conference's
       * page. */
      name: 'events',
      type: 'relationship',
      relationTo: 'events',
      hasMany: true,
      admin: {
        description: 'Conferences that list this speaker even without an activity. A speaker on an activity appears on that conference anyway.',
      },
    },
    {
      /* The link to an existing platform user. Set → Registered speaker;
       * empty → External speaker. Lends name, job title, company and
       * photo unless a manual override is provided below. */
      name: 'account',
      type: 'relationship',
      relationTo: 'participants',
      admin: {
        description:
          'Link an existing נטעים account. Its profile fills the details below; leave any field empty to inherit, or fill it to override.',
      },
    },
    {
      name: 'name',
      type: 'text',
      localized: true,
      admin: {
        description: 'External name, or an override for a linked account.',
      },
    },
    {
      name: 'jobTitle',
      type: 'text',
      localized: true,
    },
    {
      name: 'company',
      type: 'text',
      localized: true,
    },
    {
      name: 'bio',
      type: 'textarea',
      localized: true,
    },
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'socialLinks',
      type: 'array',
      admin: {
        description: 'Public links (LinkedIn, X, personal site…).',
      },
      fields: [
        { name: 'label', type: 'text' },
        { name: 'url', type: 'text' },
      ],
    },
    {
      /* Legacy single-line title. Kept as a fallback for existing rows
       * and read as jobTitle when jobTitle is empty. */
      name: 'role',
      type: 'text',
      localized: true,
      admin: {
        description: 'Legacy title field — prefer Job Title above.',
      },
    },
  ],
};
