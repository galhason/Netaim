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
  ],
};
