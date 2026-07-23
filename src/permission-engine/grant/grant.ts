import type { Role } from '../role/roles';

/*
 * A grant is a role handed to an account, optionally scoped to a single
 * conference (Identity Architecture §3). `eventSlug: null` means the
 * grant applies platform-wide.
 */
export interface Grant {
  role: Role;
  eventSlug: string | null;
}
