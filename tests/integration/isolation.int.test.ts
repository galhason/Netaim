import { beforeAll, describe, expect, it } from 'vitest';
import type { Payload } from 'payload';

const databaseUrl = process.env.TEST_DATABASE_URL;

/*
 * This suite is the only proof that the isolation layer holds against a
 * real database, and for its whole life it skipped silently whenever
 * TEST_DATABASE_URL was unset — which was every run. Skipping stays
 * allowed on a developer machine with no Postgres to hand; on CI it is
 * a failure, so the gate can never quietly stop being a gate.
 */
describe('organization isolation (integration) — availability', () => {
  it('runs against a real database on CI', () => {
    if (process.env.CI !== 'true') {
      return;
    }
    expect(
      databaseUrl,
      'TEST_DATABASE_URL is unset on CI: the isolation gate would skip silently. Start the postgres-test service and set it.',
    ).toBeTruthy();
  });
});

describe.skipIf(!databaseUrl)('organization isolation (integration)', () => {
  let payload: Payload;
  let orgA: { id: string | number };
  let orgB: { id: string | number };
  let adminA: { id: string | number };
  let eventB: { id: string | number };

  beforeAll(async () => {
    process.env.DATABASE_URL = databaseUrl as string;
    process.env.PAYLOAD_SECRET =
      process.env.PAYLOAD_SECRET ?? 'test-secret-test-secret-test-secret';

    const { getPayload } = await import('payload');
    const { default: config } = await import('@payload-config');
    payload = await getPayload({ config });

    const stamp = Date.now();
    orgA = await payload.create({
      collection: 'organizations',
      data: { name: `Org A ${stamp}`, slug: `org-a-${stamp}` },
    });
    orgB = await payload.create({
      collection: 'organizations',
      data: { name: `Org B ${stamp}`, slug: `org-b-${stamp}` },
    });
    adminA = await payload.create({
      collection: 'users',
      data: {
        email: `admin-a-${stamp}@example.test`,
        password: 'test-password-1234',
        grants: [{ role: 'orgAdmin', organization: orgA.id as number }],
      },
    });
    await payload.create({
      collection: 'events',
      data: {
        organization: orgA.id as number,
        title: 'Event A',
        slug: `event-a-${stamp}`,
        defaultLocale: 'he',
        phase: 'draft',
      },
    });
    eventB = await payload.create({
      collection: 'events',
      data: {
        organization: orgB.id as number,
        title: 'Event B',
        slug: `event-b-${stamp}`,
        defaultLocale: 'he',
        phase: 'draft',
      },
    });
  }, 120000);

  const asAdminA = async () =>
    (
      await payload.findByID({
        collection: 'users',
        id: adminA.id,
        overrideAccess: true,
      })
    ) as never;

  it('lets an organization admin read only their own events', async () => {
    const result = await payload.find({
      collection: 'events',
      overrideAccess: false,
      user: await asAdminA(),
      limit: 100,
    });
    const organizations = result.docs.map((doc) =>
      typeof doc.organization === 'object'
        ? doc.organization.id
        : doc.organization,
    );
    expect(organizations.length).toBeGreaterThan(0);
    expect(organizations.every((o) => String(o) === String(orgA.id))).toBe(
      true,
    );
  });

  it('hides foreign organizations entirely', async () => {
    const result = await payload.find({
      collection: 'organizations',
      overrideAccess: false,
      user: await asAdminA(),
      limit: 100,
    });
    const ids = result.docs.map((doc) => String(doc.id));
    expect(ids).toContain(String(orgA.id));
    expect(ids).not.toContain(String(orgB.id));
  });

  it('rejects updating a foreign event', async () => {
    await expect(
      payload.update({
        collection: 'events',
        id: eventB.id,
        data: { title: 'Hijacked' },
        overrideAccess: false,
        user: await asAdminA(),
      }),
    ).rejects.toThrow();
  });

  it('rejects creating content in a foreign organization', async () => {
    await expect(
      payload.create({
        collection: 'events',
        data: {
          organization: orgB.id as number,
          title: 'Foreign',
          slug: `foreign-${Date.now()}`,
          defaultLocale: 'he',
          phase: 'draft',
        },
        overrideAccess: false,
        user: await asAdminA(),
      }),
    ).rejects.toThrow();
  });

  it('rejects assigning grants in a foreign organization', async () => {
    await expect(
      payload.create({
        collection: 'users',
        data: {
          email: `intruder-${Date.now()}@example.test`,
          password: 'test-password-1234',
          grants: [{ role: 'contentEditor', organization: orgB.id as number }],
        },
        overrideAccess: false,
        user: await asAdminA(),
      }),
    ).rejects.toThrow();
  });
});
