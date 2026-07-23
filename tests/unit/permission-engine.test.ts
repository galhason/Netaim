import { describe, expect, it } from 'vitest';
import { can, capabilitiesOf, type Grant } from '@/permission-engine';

/*
 * The permission engine is pure and denies by default (Identity Build
 * Brief WP1): these cases are its contract.
 */
describe('permission engine', () => {
  const owner: Grant = { role: 'owner', eventSlug: null };
  const scopedEditor: Grant = { role: 'editor', eventSlug: 'summit-2026' };
  const door: Grant = { role: 'door', eventSlug: null };

  it('lets an unscoped owner pass everywhere', () => {
    expect(can([owner], 'platform:manage')).toBe(true);
    expect(can([owner], 'events:manage', 'any-conference')).toBe(true);
    expect(can([owner], 'checkin:operate')).toBe(true);
  });

  it('scopes a conference grant to its conference only', () => {
    expect(can([scopedEditor], 'events:manage', 'summit-2026')).toBe(true);
    expect(can([scopedEditor], 'events:manage', 'another-conf')).toBe(false);
    expect(can([scopedEditor], 'events:manage')).toBe(false);
  });

  it('refuses everything on an empty grant list', () => {
    expect(can([], 'content:read')).toBe(false);
    expect(can([], 'platform:manage')).toBe(false);
  });

  it('refuses capabilities outside the role bundle', () => {
    expect(can([door], 'checkin:operate')).toBe(true);
    expect(can([door], 'participants:read')).toBe(true);
    expect(can([door], 'events:manage')).toBe(false);
    expect(can([door], 'platform:manage')).toBe(false);
  });

  it('refuses unknown capabilities and unknown roles', () => {
    expect(can([owner], 'universe:bend' as never)).toBe(false);
    expect(
      can([{ role: 'sultan' as never, eventSlug: null }], 'content:read'),
    ).toBe(false);
  });

  it('collects the capabilities a scope allows', () => {
    const held = capabilitiesOf([scopedEditor, door], 'summit-2026');
    expect(held).toContain('events:manage');
    expect(held).toContain('checkin:operate');
    expect(held).not.toContain('platform:manage');
    const elsewhere = capabilitiesOf([scopedEditor, door], 'another-conf');
    expect(elsewhere).not.toContain('events:manage');
    expect(elsewhere).toContain('checkin:operate');
  });
});
