/*
 * What a person may do, named finely enough that "may edit an activity"
 * and "may delete one" are different words. A role is a bundle of these;
 * the application asks for a capability, never for a role.
 *
 * The first seven are the original set and every existing call site
 * still asks for them. The rest were added with the three Netaim roles,
 * so that a supervisor can hold everything but destruction, and staff
 * can hold the program without the people.
 */
export const CAPABILITIES = [
  'platform:manage',
  'experiences:manage',
  'events:manage',
  'registrations:manage',
  'participants:read',
  'participants:manage',
  'content:read',

  /* Granting and revoking roles — the door to everything else. */
  'access:manage',
  /* Seeing and exporting the audit log. */
  'audit:read',
  /* Destroying a conference and everything in it. */
  'events:delete',
  /* The program: reading it, shaping it, shelving it, destroying it. */
  'activities:read',
  'activities:manage',
  'activities:archive',
  'activities:delete',
  /* Removing a person's account, as opposed to blocking or editing it. */
  'participants:delete',
  /* Rooms, equipment, the export — reading versus arranging. */
  'logistics:read',
  'logistics:manage',
  /* Announcements to participants. */
  'communications:manage',
  /*
   * The conference gallery: adding and removing photographs, and
   * reviewing the ones participants send. Held by all three Netaim
   * roles — the staff who keep the programme keep the gallery too.
   */
  'gallery:manage',
] as const;

export type Capability = (typeof CAPABILITIES)[number];

export const isCapability = (value: string): value is Capability =>
  (CAPABILITIES as readonly string[]).includes(value);
