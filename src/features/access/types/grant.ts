import type { Role } from '@/permission-engine';

/*
 * The grants seam (Identity Build Brief WP2): what the Studio reads and
 * writes about who may do what. The repository also keeps the derived
 * technical principal in step with every change — a grant without its
 * principal, or the reverse, is a bug.
 */
export interface AccountGrantView {
  id: string;
  accountId: string;
  accountName: string;
  accountEmail: string;
  role: Role;
  eventSlug: string | null;
  eventTitle: string | null;
  grantedAt: string | null;
}

export interface CreateGrantInput {
  accountId: string;
  role: Role;
  eventSlug: string | null;
  grantedById: string | null;
}

export interface GrantRepository {
  listGrantsForAccount: (accountId: string) => Promise<AccountGrantView[]>;
  listGrants: () => Promise<AccountGrantView[]>;
  createGrant: (input: CreateGrantInput) => Promise<AccountGrantView | null>;
  revokeGrant: (grantId: string) => Promise<AccountGrantView | null>;
  grantById: (grantId: string) => Promise<AccountGrantView | null>;
  ownerGrantCount: () => Promise<number>;
  hasAnyGrant: () => Promise<boolean>;
}
