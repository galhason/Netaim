/*
 * The capability is the unit of permission (Identity Architecture §3):
 * one verb, checked by name, denied by default. Roles are only bundles
 * of these.
 */
export const CAPABILITIES = [
  'platform:manage',
  'experiences:manage',
  'events:manage',
  'registrations:manage',
  'participants:read',
  'participants:manage',
  'checkin:operate',
  'content:read',
] as const;

export type Capability = (typeof CAPABILITIES)[number];

export const isCapability = (value: string): value is Capability =>
  (CAPABILITIES as readonly string[]).includes(value);
