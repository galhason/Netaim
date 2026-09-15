import type { CollectionConfig } from 'payload';
import { registrationAccess } from '../access-presets';

/*
 * Participants are attendees, deliberately separate from CMS Users
 * (Domain Blueprint §2): different lifecycle, different data-protection
 * profile, passwordless (magic-link) identity. `anonymizedAt` records a
 * data-protection deletion — identity becomes a tombstone while the
 * registration's attendance statistics survive.
 */
export const Participants: CollectionConfig = {
  slug: 'participants',
  admin: {
    group: 'Registration',
    useAsTitle: 'email',
  },
  access: registrationAccess,
  fields: [
    {
      name: 'organization',
      type: 'relationship',
      relationTo: 'organizations',
      required: true,
      index: true,
    },
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'email',
      type: 'email',
      required: true,
      index: true,
    },
    {
      name: 'passwordHash',
      type: 'text',
      admin: {
        hidden: true,
        description: 'Derived credential material. Never displayed or edited.',
      },
    },
    {
      /* 2FA (TOTP): the shared secret; enabled only once confirmed. */
      name: 'totpSecret',
      type: 'text',
      admin: {
        hidden: true,
        description: 'Second-factor secret. Never displayed or edited.',
      },
    },
    {
      name: 'totpEnabledAt',
      type: 'date',
      admin: { hidden: true },
    },
    {
      name: 'phone',
      type: 'text',
    },
    {
      /*
       * The language the participant chose at registration. While they are
       * signed in every page is served in this language.
       */
      name: 'preferredLocale',
      type: 'select',
      options: [
        { label: 'Hebrew', value: 'he' },
        { label: 'English', value: 'en' },
      ],
      defaultValue: 'he',
      admin: {
        description: 'Site language while this participant is signed in',
      },
    },
    {
      /*
       * Connection Framework v1.0: the participant owns every channel.
       * These open only to connections they approved — Netaim Messages
       * is always on and never stored; phone and email default OFF.
       */
      name: 'contactPrefs',
      type: 'group',
      admin: {
        description:
          'Which channels open to approved connections, and whether this person is listed among the participants of conferences they attend.',
      },
      fields: [
        { name: 'whatsapp', type: 'checkbox', defaultValue: true },
        /*
         * PRD §5.2 — mutual disclosure: once a connection request is
         * accepted, phone and email are revealed to both sides. They
         * are therefore open by default and a person may close either
         * from the profile; nothing is shown to anyone before acceptance.
         */
        { name: 'phone', type: 'checkbox', defaultValue: true },
        { name: 'email', type: 'checkbox', defaultValue: true },
        { name: 'meetings', type: 'checkbox', defaultValue: true },
        /*
         * Opt-in, per the client's PRD (§5.1): a person appears in the
         * participants directory only after answering "yes" — the
         * question is asked on the registration form itself, so the
         * choice is made knowingly rather than discovered. What a "yes"
         * shows is only the name, role and organisation the person
         * already gave; the contact channels above stay closed either
         * way. The answer lives on the person, not on a conference, so
         * changing it in the profile applies everywhere at once.
         */
        { name: 'directory', type: 'checkbox', defaultValue: false },
      ],
    },
    {
      name: 'accessibilityNeeds',
      type: 'textarea',
    },
    {
      name: 'dietary',
      type: 'text',
    },
    {
      name: 'orgName',
      type: 'text',
    },
    {
      name: 'roleTitle',
      type: 'text',
    },
    {
      name: 'interests',
      type: 'text',
      admin: {
        description: 'Comma-separated interests shown on the profile card',
      },
    },
    /*
     * How this person introduces themselves in a participants list.
     *
     * These lived on a per-conference `networking-profiles` row, which
     * meant a guest attending two conferences had two half-filled
     * introductions and no way to know which one a stranger was
     * reading — while the fields beside them here (interests, role,
     * organisation) were already answered once for the account. One
     * profile, shown wherever the person is.
     */
    {
      name: 'headline',
      type: 'text',
      admin: {
        description: 'One line — the role and organisation as they say it',
      },
    },
    {
      name: 'bio',
      type: 'textarea',
    },
    {
      name: 'links',
      type: 'array',
      admin: { description: 'A couple of places to find this person' },
      fields: [
        { name: 'label', type: 'text' },
        { name: 'url', type: 'text' },
      ],
    },
    {
      name: 'photo',
      type: 'relationship',
      relationTo: 'media',
    },
    {
      name: 'blocked',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'A blocked participant cannot enter the personal lounge',
      },
    },
    {
      name: 'anonymizedAt',
      type: 'date',
    },
  ],
};
