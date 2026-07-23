import { describe, expect, it } from 'vitest';
import type { AccessArgs } from 'payload';
import {
  platformOnly,
  scopedByOrganization,
  scopedCreate,
  scopedSelfOrganization,
} from '@/cms/access';

const args = (user: unknown, data?: unknown): AccessArgs =>
  ({ req: { user }, data }) as unknown as AccessArgs;

const orgAdminOf = (organization: number) => ({
  id: 10,
  grants: [{ role: 'orgAdmin', organization }],
});

describe('organization isolation at the access layer', () => {
  it('denies anonymous access', () => {
    expect(scopedByOrganization('content:write')(args(null))).toBe(false);
  });

  it('constrains organization members to their organizations', () => {
    const result = scopedByOrganization('content:write')(args(orgAdminOf(1)));
    expect(result).toEqual({ organization: { in: [1] } });
  });

  it('denies members without the permission anywhere', () => {
    const user = { id: 3, grants: [{ role: 'readOnly', organization: 1 }] };
    expect(scopedByOrganization('content:write')(args(user))).toBe(false);
  });

  it('lets platform owners through without constraints', () => {
    const user = { id: 1, grants: [{ role: 'platformOwner' }] };
    expect(scopedByOrganization('content:write')(args(user))).toBe(true);
  });

  it('rejects creating content for a foreign organization', () => {
    const access = scopedCreate('content:write');
    expect(access(args(orgAdminOf(1), { organization: 2 }))).toBe(false);
    expect(access(args(orgAdminOf(1), { organization: 1 }))).toBe(true);
  });

  it('rejects creating content without an organization', () => {
    expect(scopedCreate('content:write')(args(orgAdminOf(1), {}))).toBe(false);
  });

  it('scopes the organizations collection to membership', () => {
    const result = scopedSelfOrganization('content:read')(args(orgAdminOf(4)));
    expect(result).toEqual({ id: { in: [4] } });
  });

  it('reserves platform actions for platform scope', () => {
    expect(platformOnly('platform:manage')(args(orgAdminOf(1)))).toBe(false);
    expect(
      platformOnly('platform:manage')(
        args({ id: 1, grants: [{ role: 'platformOwner' }] }),
      ),
    ).toBe(true);
  });
});
