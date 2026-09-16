import type { GlobalConfig } from 'payload';
import { anyGrantWith, isPublic } from '../access';

/*
 * The live-site pointer: which single published conference IS the
 * public website right now. The Studio flips this; the frontend reads
 * it to know whose landing, program, speakers and information to
 * render. Multi-conference support is unchanged — every conference
 * still lives in the Studio, and only one wears the site at a time.
 */
export const Site: GlobalConfig = {
  slug: 'site',
  label: 'Site',
  admin: {
    group: 'Content',
  },
  access: {
    read: isPublic,
    update: anyGrantWith('content:write'),
  },
  fields: [
    {
      name: 'activeConference',
      type: 'relationship',
      relationTo: 'events',
      admin: {
        description:
          'The published conference shown as the public website (its landing, program, speakers and information).',
      },
    },
    /*
     * The logo, in the two treatments the platform's two chromes need.
     * Left unset, the build's own artwork is drawn — so this is an
     * override, never a requirement, and clearing it restores the mark
     * rather than emptying the header.
     */
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description:
          'The logo drawn on light backgrounds — the daylight pages and the footer.',
      },
    },
    {
      name: 'logoOnDark',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description:
          'The logo drawn on the navy chrome — the navigation bar and mail headers. Falls back to the light logo when unset.',
      },
    },
  ],
};
