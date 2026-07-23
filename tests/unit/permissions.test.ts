import { describe, expect, it } from 'vitest';
import { roleHasPermission } from '@/auth';

describe('role matrix', () => {
  it('grants platform owners every permission', () => {
    expect(roleHasPermission('platformOwner', 'platform:manage')).toBe(true);
    expect(roleHasPermission('platformOwner', 'content:launch')).toBe(true);
    expect(roleHasPermission('platformOwner', 'registrations:manage')).toBe(true);
  });

  it('keeps platform management away from every other role', () => {
    for (const role of [
      'orgAdmin',
      'eventManager',
      'contentEditor',
      'registrationManager',
      'volunteerManager',
      'reviewer',
      'readOnly',
    ] as const) {
      expect(roleHasPermission(role, 'platform:manage')).toBe(false);
    }
  });

  it('separates writing from launching', () => {
    expect(roleHasPermission('contentEditor', 'content:write')).toBe(true);
    expect(roleHasPermission('contentEditor', 'content:launch')).toBe(false);
    expect(roleHasPermission('eventManager', 'content:launch')).toBe(true);
  });

  it('keeps reviewers read-and-review only', () => {
    expect(roleHasPermission('reviewer', 'content:review')).toBe(true);
    expect(roleHasPermission('reviewer', 'content:write')).toBe(false);
  });

  it('keeps registration data away from content roles', () => {
    expect(roleHasPermission('contentEditor', 'registrations:read')).toBe(false);
    expect(roleHasPermission('registrationManager', 'registrations:manage')).toBe(true);
    expect(roleHasPermission('registrationManager', 'content:write')).toBe(false);
  });

  it('keeps read-only truly read-only', () => {
    expect(roleHasPermission('readOnly', 'content:read')).toBe(true);
    expect(roleHasPermission('readOnly', 'content:write')).toBe(false);
    expect(roleHasPermission('readOnly', 'registrations:manage')).toBe(false);
  });
});
