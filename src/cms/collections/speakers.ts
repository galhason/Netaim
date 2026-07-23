import type { CollectionConfig } from 'payload';
import { orgContentAccess } from '../access-presets';

/*
 * A Speaker is one conference's roster entry for a voice on stage. It is
 * hybrid by design: it may LINK an existing platform account (a
 * participant) and lend that account's identity live, or it may hold its
 * own EXTERNAL details for a guest with no HASON account. When an account
 * is linked, the manual fields act as per-conference overrides — the same
 * account-or-manual pattern the opening speakers already use — so a
 * profile edit propagates to every activity without touching the speaker.
 * Sessions reference speakers many-to-many; a speaker's activities are the
 * reverse of that relationship, so future Speaker Pages need no new links.
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
      /* The conference this roster entry belongs to. External speakers
       * live only inside their conference; a linked account may appear as
       * a separate roster entry in each conference it speaks at. */
      name: 'event',
      type: 'relationship',
      relationTo: 'events',
      index: true,
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
          'Link an existing נטעים account. Its profile fills the details below; leave any field empty to inherit, or fill it to override for this conference.',
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
