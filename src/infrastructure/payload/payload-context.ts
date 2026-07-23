import { createHmac } from 'crypto';
import { cookies, headers } from 'next/headers';
import { getPayload, type Payload } from 'payload';
import config from '@payload-config';
import type { User } from '@/payload-types';
import { organizationsWithPermission, type Grant } from '@/auth';

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
 * the same HMAC contract the identity service signs with. Staff never
 * hold a Payload cookie — their database identity is the derived
 * technical principal, resolved here from the account's email.
 */
const SESSION_COOKIE = 'participant_session';
const SESSION_SECRET =
  process.env.REGISTRATION_LINK_SECRET ?? process.env.PAYLOAD_SECRET ?? '';

const signSession = (value: string): string =>
  createHmac('sha256', SESSION_SECRET).update(value).digest('hex');

const principalFromAccountSession = async (
  payload: Payload,
): Promise<User | null> => {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) {
    return null;
  }
  const [id, signature] = raw.split('.');
  if (!id || !signature || signSession(id) !== signature) {
    return null;
  }
  const account = await payload
    .findByID({
      collection: 'participants',
      id,
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
