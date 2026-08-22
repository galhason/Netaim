import { cookies, headers } from 'next/headers';
import { getPayload, type Payload } from 'payload';
import config from '@payload-config';
import type { User } from '@/payload-types';
import { organizationsWithPermission, type Grant } from '@/auth';
import { SESSION_COOKIE, readSessionCookie } from '@/shared';

export interface ActorContext {
  payload: Payload;
  user: User;
  organizationId: number | null;
}

/*
 * System access for unauthenticated domain paths (public registration,
 * magic-link sessions, the notification outbox). These operate with
 * overrideAccess and always scope writes to the resolved event's
 * organization — there is no CMS user to carry the grant.
 */
export const getSystemPayload = (): Promise<Payload> => getPayload({ config });

/*
 * Every write adapter resolves the acting creator from the request and
 * performs Payload operations with overrideAccess disabled, so the S1
 * isolation layer governs every Studio mutation. The acting
 * organization is the creator's first writable organization; explicit
 * organization switching arrives with multi-organization workspaces.
 */
/*
 * The account session cookie, verified at the infrastructure seam with
 * the same contract the identity service signs with. Staff never hold a
 * Payload cookie — their database identity is the derived technical
 * principal, resolved here from the account's email.
 *
 * This reads the session record rather than trusting the cookie alone,
 * because it must reach the same verdict as the identity service. A
 * revoked session that still opened the Studio would mean signing out
 * ended the guest's access and left the operator's standing.
 *
 * The lookup cannot go through the repository: the repository resolves
 * its Payload client from this module.
 */
const principalFromAccountSession = async (
  payload: Payload,
): Promise<User | null> => {
  const store = await cookies();
  const now = new Date();
  const tokenHash = readSessionCookie(
    store.get(SESSION_COOKIE)?.value,
    now.getTime(),
  );
  if (!tokenHash) {
    return null;
  }
  const sessions = await payload
    .find({
      collection: 'account-sessions',
      where: {
        and: [
          { tokenHash: { equals: tokenHash } },
          { revokedAt: { exists: false } },
          { expiresAt: { greater_than: now.toISOString() } },
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    .catch(() => null);
  const session = sessions?.docs[0] as
    | { participant?: number | string }
    | undefined;
  if (session?.participant === undefined) {
    return null;
  }
  const account = await payload
    .findByID({
      collection: 'participants',
      id: session.participant,
      depth: 0,
      overrideAccess: true,
    })
    .catch(() => null);
  if (!account?.email || account.blocked === true) {
    return null;
  }
  const principals = await payload.find({
    collection: 'users',
    where: { email: { equals: account.email } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  return (principals.docs[0] as User | undefined) ?? null;
};

export const actorContext = async (): Promise<ActorContext | null> => {
  const payload = await getPayload({ config });
  const { user: sessionUser } = await payload.auth({
    headers: await headers(),
  });
  const user = sessionUser ?? (await principalFromAccountSession(payload));

  if (!user) {
    return null;
  }

  const scope = organizationsWithPermission(
    (user.grants ?? []) as Grant[],
    'content:write',
  );

  let organizationId: number | null = null;

  if (!scope.all && scope.organizations.length > 0) {
    organizationId = Number(scope.organizations[0]);
  } else if (scope.all) {
    const first = await payload.find({
      collection: 'organizations',
      limit: 1,
      sort: 'createdAt',
    });
    organizationId = first.docs[0] ? Number(first.docs[0].id) : null;
  }

  return { payload, user: user as User, organizationId };
};
