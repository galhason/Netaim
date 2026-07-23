import { randomBytes } from 'crypto';
import { relationshipId } from '@/auth';
import type {
  AccountGrantView,
  CreateGrantInput,
  GrantRepository,
} from '@/features/access/types/grant';
import { isRole, type Role } from '@/permission-engine';
import { getSystemPayload } from './payload-context';

/*
 * Grants persistence plus the derived technical principal (Identity
 * Build Brief WP2+WP3). Every mutation ends by re-deriving the
 * account's Payload user from its remaining grants, so the two can
 * never drift apart. All operations here are system paths: the
 * principal is maintained by the platform itself — there is no actor
 * to carry, hence overrideAccess.
 */
interface GrantRow {
  id: number | string;
  account:
    | number
    | string
    | { id: number | string; name?: string; email?: string };
  role: string;
  event?: number | string | { id: number | string; slug?: string; title?: string } | null;
  grantedAt?: string | null;
}

type SystemPayload = Awaited<ReturnType<typeof getSystemPayload>>;

/*
 * The account's role maps onto the database layer's own role system, so
 * Payload keeps enforcing access as an independent second layer.
 */
type PrincipalRole =
  | 'platformOwner'
  | 'orgAdmin'
  | 'contentEditor'
  | 'registrationManager'
  | 'readOnly';

const PRINCIPAL_ROLE: Record<
  Role,
  { role: PrincipalRole; platformWide: boolean }
> = {
  owner: { role: 'platformOwner', platformWide: true },
  producer: { role: 'orgAdmin', platformWide: false },
  editor: { role: 'contentEditor', platformWide: false },
  door: { role: 'registrationManager', platformWide: false },
  viewer: { role: 'readOnly', platformWide: false },
};

const toView = (row: GrantRow): AccountGrantView => {
  const account =
    typeof row.account === 'object'
      ? row.account
      : { id: row.account, name: '', email: '' };
  const event = typeof row.event === 'object' && row.event ? row.event : null;
  return {
    id: String(row.id),
    accountId: String(account.id),
    accountName: account.name ?? '',
    accountEmail: account.email ?? '',
    role: isRole(row.role) ? row.role : 'viewer',
    eventSlug: event?.slug ?? null,
    eventTitle: event?.title ?? null,
    grantedAt: row.grantedAt ?? null,
  };
};

const accountDoc = async (
  payload: SystemPayload,
  accountId: string,
): Promise<{
  id: number | string;
  name?: string;
  email?: string;
  organization?: number | string | { id: number | string };
  blocked?: boolean | null;
} | null> =>
  payload
    .findByID({
      collection: 'participants',
      id: accountId,
      depth: 0,
      overrideAccess: true,
    })
    .catch(() => null);

/*
 * Re-derives the technical principal from the account's remaining
 * grants: no grants (or a blocked account) removes the user; otherwise
 * the user is created or updated with the mapped database-layer grants.
 * The password is random and unusable — the principal is never a login.
 */
const syncPrincipal = async (
  payload: SystemPayload,
  accountId: string,
): Promise<void> => {
  const account = await accountDoc(payload, accountId);
  if (!account?.email) {
    return;
  }
  const remaining = await payload.find({
    collection: 'account-grants',
    where: { account: { equals: Number(accountId) } },
    depth: 1,
    limit: 100,
    overrideAccess: true,
  });
  const rows = remaining.docs as unknown as GrantRow[];

  const existing = await payload.find({
    collection: 'users',
    where: { email: { equals: account.email } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const principal = existing.docs[0];

  if (rows.length === 0 || account.blocked === true) {
    if (principal) {
      await payload.delete({
        collection: 'users',
        id: principal.id,
        overrideAccess: true,
      });
    }
    return;
  }

  const organization = Number(relationshipId(account.organization ?? null));
  const seen = new Set<string>();
  const grants = rows.flatMap((row) => {
    const mapped = PRINCIPAL_ROLE[isRole(row.role) ? row.role : 'viewer'];
    const eventId = row.event ? Number(relationshipId(row.event)) : null;
    const fingerprint = `${mapped.role}:${mapped.platformWide ? '' : organization}:${eventId ?? ''}`;
    if (seen.has(fingerprint)) {
      return [];
    }
    seen.add(fingerprint);
    return [
      {
        role: mapped.role,
        ...(mapped.platformWide ? {} : { organization }),
        ...(eventId ? { event: eventId } : {}),
      },
    ];
  });

  if (principal) {
    await payload.update({
      collection: 'users',
      id: principal.id,
      data: { grants },
      overrideAccess: true,
    });
    return;
  }
  await payload.create({
    collection: 'users',
    data: {
      email: account.email,
      name: account.name ?? account.email,
      password: `${randomBytes(24).toString('hex')}!Aa`,
      grants,
    },
    overrideAccess: true,
  });
};

const findGrant = async (
  payload: SystemPayload,
  grantId: string,
): Promise<GrantRow | null> =>
  (await payload
    .findByID({
      collection: 'account-grants',
      id: grantId,
      depth: 1,
      overrideAccess: true,
    })
    .catch(() => null)) as GrantRow | null;

export const payloadAccountGrantRepository: GrantRepository = {
  listGrantsForAccount: async (accountId) => {
    const payload = await getSystemPayload();
    const found = await payload.find({
      collection: 'account-grants',
      where: { account: { equals: Number(accountId) } },
      depth: 1,
      limit: 100,
      overrideAccess: true,
    });
    return (found.docs as unknown as GrantRow[]).map(toView);
  },

  listGrants: async () => {
    const payload = await getSystemPayload();
    const found = await payload.find({
      collection: 'account-grants',
      depth: 1,
      limit: 500,
      sort: '-grantedAt',
      overrideAccess: true,
    });
    return (found.docs as unknown as GrantRow[]).map(toView);
  },

  grantById: async (grantId) => {
    const payload = await getSystemPayload();
    const row = await findGrant(payload, grantId);
    return row ? toView(row) : null;
  },

  createGrant: async (input: CreateGrantInput) => {
    const payload = await getSystemPayload();
    const account = await accountDoc(payload, input.accountId);
    if (!account) {
      return null;
    }
    const organization = Number(relationshipId(account.organization ?? null));

    let eventId: number | null = null;
    if (input.eventSlug) {
      const events = await payload.find({
        collection: 'events',
        where: { slug: { equals: input.eventSlug } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      });
      const event = events.docs[0];
      if (!event) {
        return null;
      }
      eventId = Number(event.id);
    }

    const created = await payload.create({
      collection: 'account-grants',
      data: {
        organization,
        account: Number(input.accountId),
        role: input.role,
        ...(eventId ? { event: eventId } : {}),
        ...(input.grantedById
          ? { grantedBy: Number(input.grantedById) }
          : {}),
        grantedAt: new Date().toISOString(),
      },
      depth: 1,
      overrideAccess: true,
    });
    await syncPrincipal(payload, input.accountId);
    return toView(created as unknown as GrantRow);
  },

  revokeGrant: async (grantId) => {
    const payload = await getSystemPayload();
    const row = await findGrant(payload, grantId);
    if (!row) {
      return null;
    }
    const view = toView(row);
    await payload.delete({
      collection: 'account-grants',
      id: grantId,
      overrideAccess: true,
    });
    await syncPrincipal(payload, view.accountId);
    return view;
  },

  ownerGrantCount: async () => {
    const payload = await getSystemPayload();
    const found = await payload.find({
      collection: 'account-grants',
      where: { role: { equals: 'owner' } },
      limit: 0,
      depth: 0,
      overrideAccess: true,
    });
    return found.totalDocs;
  },

  hasAnyGrant: async () => {
    const payload = await getSystemPayload();
    const found = await payload.find({
      collection: 'account-grants',
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    return found.docs.length > 0;
  },
};
