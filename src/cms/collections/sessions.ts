import type { CollectionConfig } from 'payload';
import {
  ACTIVITY_LANGUAGES,
  ACTIVITY_LANGUAGE_LABELS,
  AUDIENCES,
  AUDIENCE_LABELS,
  TOPICS,
  TOPIC_LABELS,
} from '@/shared/constants/activity-facets';
import { publicContentAccess } from '../access-presets';

/*
 * A Session is a moment in the program (Domain Blueprint §7: workshop is
 * a session variant, not a separate entity). Capacity and registration
 * apply to registrable types (workshop). Placement in a Room and time on
 * a day compose the agenda projection. Published agenda reads publicly.
 */
export const Sessions: CollectionConfig = {
  slug: 'sessions',
  access: publicContentAccess,
  admin: {
    group: 'Program',
    useAsTitle: 'title',
    defaultColumns: ['title', 'sessionType', 'startsAt'],
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
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'description',
      type: 'textarea',
      localized: true,
    },
    {
      name: 'sessionType',
      type: 'select',
      required: true,
      defaultValue: 'talk',
      options: [
        { label: 'Talk', value: 'talk' },
        { label: 'Workshop', value: 'workshop' },
        { label: 'Keynote', value: 'keynote' },
        { label: 'Break', value: 'break' },
        { label: 'Tour', value: 'tour' },
      ],
    },
    {
      name: 'speakers',
      type: 'relationship',
      relationTo: 'speakers',
      hasMany: true,
      admin: {
        description: 'One or more speakers leading this activity',
      },
    },
    {
      name: 'room',
      type: 'relationship',
      relationTo: 'rooms',
    },
    {
      name: 'track',
      type: 'text',
      localized: true,
    },
    {
      name: 'startsAt',
      type: 'date',
    },
    {
      name: 'endsAt',
      type: 'date',
    },
    {
      name: 'capacity',
      type: 'number',
    },
    {
      name: 'waitlistEnabled',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Show this session in the Featured Sessions on the landing',
      },
    },
    {
      name: 'image',
      type: 'relationship',
      relationTo: 'media',
      admin: {
        description: 'Thumbnail shown on the Featured Sessions cards',
      },
    },
    /*
     * Who the activity is for, what field it belongs to, and the
     * language it is held in — the three facets the production's own
     * programme sheet names for every activity. Closed lists, chosen in
     * the Studio, read in either language (src/shared/constants/activity-facets).
     * The old free-text `language` was folded into these by migration.
     */
    {
      name: 'audiences',
      type: 'select',
      hasMany: true,
      options: AUDIENCES.map((value) => ({ label: AUDIENCE_LABELS[value].en, value })),
    },
    {
      name: 'topics',
      type: 'select',
      hasMany: true,
      options: TOPICS.map((value) => ({ label: TOPIC_LABELS[value].en, value })),
    },
    {
      name: 'languages',
      type: 'select',
      hasMany: true,
      options: ACTIVITY_LANGUAGES.map((value) => ({
        label: ACTIVITY_LANGUAGE_LABELS[value].en,
        value,
      })),
    },
    { name: 'translated', type: 'checkbox', defaultValue: false },
    { name: 'languageNote', type: 'text', localized: true },
    {
      name: 'equipment',
      type: 'text',
      localized: true,
    },
    { name: 'subtitle', type: 'text', localized: true },
    /* Where it is held, in words — "חדר פראג", "Floor 2" — beside the optional room record. */
    { name: 'floor', type: 'text', localized: true },
    { name: 'registrationOpensAt', type: 'date' },
    { name: 'registrationClosesAt', type: 'date' },
    { name: 'allowCancellation', type: 'checkbox', defaultValue: true },
    { name: 'cancellationDeadline', type: 'date' },
    {
      /*
       * Shelved, not destroyed. Set when a supervisor archives the
       * activity; null while it stands on the program. Every public
       * read filters on it, so an archived activity is unpublished the
       * moment this is written, and a restore is one null away.
       */
      name: 'archivedAt',
      type: 'date',
      index: true,
      admin: { position: 'sidebar' },
    },
  ],
};
