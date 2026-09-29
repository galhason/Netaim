import type { CollectionConfig } from 'payload';
import { SUPPORTED_LOCALES } from '@/config/locales';
import { EVENT_CAPABILITIES, EVENT_PHASES } from '@/event-engine';
import { GUIDING_TONE_KEYS } from '@/shared/utils/guiding-tones';
import { publicContentAccess } from '../access-presets';
import {
  demoteOtherPublishedConferences,
  pointSiteAtPublishedConference,
} from '../hooks/single-published-conference';

/*
 * Event is the aggregate root: Event -> Experience -> Scenes.
 * Each event defines its own default locale (Product Owner decision, Sprint 0).
 * Field schema expands in future sprints; only the architectural
 * contract is defined here.
 */
export const Events: CollectionConfig = {
  slug: 'events',
  admin: {
    group: 'Content',
    useAsTitle: 'title',
  },
  versions: {
    drafts: true,
  },
  /*
   * One conference wears the site, and never two. The rule is enforced
   * here rather than in the Studio's launch service so that it holds for
   * every way `_status` can become 'published' -- the button, Payload's
   * admin screens, REST and GraphQL alike. See the hooks for why the
   * work is split across two of them.
   */
  hooks: {
    beforeChange: [demoteOtherPublishedConferences],
    afterChange: [pointSiteAtPublishedConference],
  },
  access: publicContentAccess,
  fields: [
    {
      name: 'composition',
      type: 'array',
      admin: {
        description: 'Scene order and visibility — directed from the Studio',
      },
      fields: [
        { name: 'scene', type: 'text', required: true },
        { name: 'hidden', type: 'checkbox', defaultValue: false },
        { name: 'variant', type: 'text' },
        { name: 'density', type: 'text' },
        { name: 'emphasis', type: 'text' },
      ],
    },
    {
      name: 'organization',
      type: 'relationship',
      relationTo: 'organizations',
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
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'defaultLocale',
      type: 'select',
      required: true,
      options: SUPPORTED_LOCALES.map((locale) => ({
        label: locale,
        value: locale,
      })),
    },
    {
      name: 'experience',
      type: 'relationship',
      relationTo: 'experiences',
      hasMany: false,
    },
    {
      name: 'startsAt',
      type: 'date',
    },
    {
      /*
       * When a conference ends. Optional: without it the platform treats
       * the conference as occupying the remainder of its start day when
       * checking a guest's schedule conflicts.
       */
      name: 'endsAt',
      type: 'date',
    },
    {
      name: 'location',
      type: 'text',
      localized: true,
    },
    /*
     * The clock the conference runs on.
     *
     * Every schedule time is stored as an instant and read back in this
     * zone, so a producer typing 14:00 and a guest reading 14:00 mean the
     * same moment — whichever country the conference is held in and
     * wherever the server happens to run. Not localized: a timezone is
     * the same fact in both languages.
     */
    {
      name: 'timezone',
      type: 'select',
      defaultValue: 'Asia/Jerusalem',
      options: [
        { label: 'ישראל · Jerusalem (UTC+2/+3)', value: 'Asia/Jerusalem' },
        { label: 'מרכז אירופה · Berlin, Paris', value: 'Europe/Berlin' },
        { label: 'פראג · Prague (UTC+1/+2)', value: 'Europe/Prague' },
        { label: 'לונדון · London', value: 'Europe/London' },
        { label: 'ניו יורק · New York', value: 'America/New_York' },
        { label: 'שיקגו · Chicago', value: 'America/Chicago' },
        { label: 'לוס אנג׳לס · Los Angeles', value: 'America/Los_Angeles' },
        { label: 'דובאי · Dubai', value: 'Asia/Dubai' },
        { label: 'UTC', value: 'UTC' },
      ],
    },
    {
      name: 'teaser',
      type: 'text',
      localized: true,
    },
    {
      name: 'poster',
      type: 'relationship',
      relationTo: 'media',
    },
    {
      name: 'heroImage',
      type: 'relationship',
      relationTo: 'media',
    },
    {
      /* The conference's moving background; heroImage stays its poster. */
      name: 'heroVideo',
      type: 'relationship',
      relationTo: 'media',
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'opening',
      type: 'group',
      admin: {
        description: 'Conference opening experience content',
      },
      fields: [
        { name: 'arrivalEyebrow', type: 'text', localized: true },
        {
          name: 'story',
          type: 'group',
          fields: [
            { name: 'eyebrow', type: 'text', localized: true },
            { name: 'title', type: 'text', localized: true },
            { name: 'paragraph', type: 'textarea', localized: true },
            { name: 'image', type: 'relationship', relationTo: 'media' },
          ],
        },
        {
          name: 'quote',
          type: 'group',
          fields: [
            { name: 'text', type: 'textarea', localized: true },
            { name: 'attribution', type: 'text', localized: true },
            { name: 'role', type: 'text', localized: true },
            { name: 'image', type: 'relationship', relationTo: 'media' },
            { name: 'statValue', type: 'text' },
            { name: 'statLabel', type: 'text', localized: true },
          ],
        },
        {
          name: 'moments',
          type: 'array',
          fields: [
            { name: 'image', type: 'relationship', relationTo: 'media' },
            { name: 'caption', type: 'text', localized: true },
          ],
        },
        {
          name: 'speakers',
          type: 'array',
          admin: {
            description:
              'Chosen voices on stage: an existing platform account, or a manual name and photo',
          },
          fields: [
            { name: 'account', type: 'relationship', relationTo: 'participants' },
            { name: 'name', type: 'text' },
            { name: 'role', type: 'text', localized: true },
            { name: 'photo', type: 'relationship', relationTo: 'media' },
          ],
        },
        {
          /*
           * The "a taste of the conference" section on the WordPress
           * page (#nt-preview): its heading, the line beneath it, and
           * the picture behind the whole band. All three were written
           * into the theme, so the only way to change a word of them
           * was to edit PHP. They are content, and content belongs to
           * whoever runs the conference.
           */
          name: 'preview',
          type: 'group',
          admin: {
            description:
              'The "a taste of the conference" section: heading, line and backdrop',
          },
          fields: [
            { name: 'title', type: 'text', localized: true },
            { name: 'lede', type: 'textarea', localized: true },
            { name: 'image', type: 'relationship', relationTo: 'media' },
          ],
        },
        {
          name: 'programDays',
          type: 'array',
          admin: {
            description:
              'Per-day themes for the program journey (Day 1, 2, 3…): one row per conference day, in order',
          },
          fields: [
            { name: 'theme', type: 'text', localized: true },
            { name: 'description', type: 'textarea', localized: true },
            {
              /*
               * The day's own picture in the preview section. Until now
               * that slot borrowed the cover of the day's first
               * activity, which meant the only way to change it was to
               * change an activity's cover — and the two are not the
               * same decision. Left empty the site may still fall back
               * to the activity's cover; set, this wins.
               */
              name: 'image',
              type: 'relationship',
              relationTo: 'media',
            },
          ],
        },
        {
          name: 'venue',
          type: 'group',
          fields: [
            { name: 'name', type: 'text', localized: true },
            /*
             * The street address, written out. The information page builds
             * its map and navigation links from this; without it those
             * links fall back to the conference's `location`, which is
             * often a city or a building's nickname and navigates nowhere
             * useful.
             */
            { name: 'address', type: 'text', localized: true },
            /*
             * An optional pinned map link, for when the generated search
             * finds the wrong place — a new building, a side entrance, a
             * venue that shares its name with somewhere else.
             */
            { name: 'mapUrl', type: 'text' },
            { name: 'mapLabel', type: 'text', localized: true },
            { name: 'narrative', type: 'textarea', localized: true },
            { name: 'accessibilityInfo', type: 'textarea', localized: true },
            { name: 'emergencyInfo', type: 'textarea', localized: true },
            { name: 'image', type: 'relationship', relationTo: 'media' },
            {
              name: 'facts',
              type: 'array',
              fields: [
                { name: 'label', type: 'text', localized: true },
                { name: 'description', type: 'text', localized: true },
                {
                  name: 'icon',
                  type: 'select',
                  defaultValue: 'accessibility',
                  options: [
                    { label: 'Accessibility', value: 'accessibility' },
                    { label: 'Parking', value: 'parking' },
                    { label: 'Transit', value: 'transit' },
                    { label: 'Hotel', value: 'hotel' },
                    { label: 'Green', value: 'leaf' },
                    { label: 'Coffee', value: 'coffee' },
                    { label: 'Wi-Fi', value: 'wifi' },
                    { label: 'Food', value: 'food' },
                    { label: 'Family', value: 'family' },
                  ],
                },
              ],
            },
          ],
        },
        {
          name: 'closing',
          type: 'group',
          fields: [
            { name: 'line', type: 'textarea', localized: true },
            { name: 'image', type: 'relationship', relationTo: 'media' },
          ],
        },
      ],
    },
    {
      name: 'atmosphere',
      type: 'select',
      defaultValue: 'bronze',
      options: GUIDING_TONE_KEYS.map((tone) => ({
        label: tone,
        value: tone,
      })),
    },
    {
      name: 'phase',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: EVENT_PHASES.map((phase) => ({ label: phase, value: phase })),
    },
    {
      name: 'capabilities',
      type: 'select',
      hasMany: true,
      options: EVENT_CAPABILITIES.map((capability) => ({
        label: capability,
        value: capability,
      })),
    },
  ],
};
