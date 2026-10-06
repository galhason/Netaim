/*
 * The system page: the product's own record of what was released, in
 * which version and when. Written by the developer, read by every
 * Netaim role in the Studio.
 */
export const SYSTEM_UPDATE_KINDS = ['feature', 'improvement', 'fix', 'security'] as const;

export type SystemUpdateKind = (typeof SYSTEM_UPDATE_KINDS)[number];

export const isSystemUpdateKind = (value: string): value is SystemUpdateKind =>
  (SYSTEM_UPDATE_KINDS as readonly string[]).includes(value);

export interface SystemUpdate {
  id: string;
  version: string;
  title: string;
  /* What shipped, one item per line. */
  details: string;
  kind: SystemUpdateKind;
  /* The day it was released, YYYY-MM-DD. */
  releasedAt: string;
  publishedByName: string | null;
}

export interface SystemUpdateInput {
  version: string;
  title: string;
  details: string;
  kind: SystemUpdateKind;
  releasedAt: string;
}

export interface SystemUpdateRepository {
  /* Newest release first. */
  list: () => Promise<SystemUpdate[]>;
  create: (input: SystemUpdateInput, publishedById: string) => Promise<SystemUpdate>;
  update: (id: string, input: SystemUpdateInput) => Promise<SystemUpdate | null>;
  remove: (id: string) => Promise<boolean>;
}
