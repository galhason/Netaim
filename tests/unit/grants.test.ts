import { describe, expect, it } from 'vitest';
import { hasPermission, organizationsWithPermission } from '@/auth';

describe('grant scope resolution', () => {
  it('resolves platform grants to all organizations', () => {
    const scope = organizationsWithPermission(
      [{ role: 'platformOwner' }],
      'content:write',
    );
    expect(scope).toEqual({ all: true });
  });

  it('collects only organizations whose role carries the permission', () => {
    const scope = organizationsWithPermission(
      [
        { role: 'orgAdmin', organization: 1 },
        { role: 'readOnly', organization: 2 },
      ],
      'content:write',
    );
    expect(scope).toEqual({ all: false, organizations: [1] });
  });

  it('normalizes populated relationship values', () => {
    const scope = organizationsWithPermission(
      [{ role: 'eventManager', organization: { id: 7 } }],
      'content:launch',
    );
    expect(scope).toEqual({ all: false, organizations: [7] });
  });

  it('ignores non-platform grants without an organization', () => {
    const scope = organizationsWithPermission(
      [{ role: 'orgAdmin' }],
      'content:write',
    );
    expect(scope).toEqual({ all: false, organizations: [] });
  });

  it('answers organization-specific permission checks', () => {
    const grants = [{ role: 'orgAdmin' as const, organization: 1 }];
    expect(hasPermission(grants, 'members:manage', 1)).toBe(true);
    expect(hasPermission(grants, 'members:manage', 2)).toBe(false);
    expect(hasPermission(grants, 'platform:manage')).toBe(false);
  });
});
