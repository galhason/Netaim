import { describe, expect, it } from 'vitest';
import {
  ASSIGNABLE_ROLES,
  CAPABILITIES,
  ROLE_CAPABILITIES,
  ROLE_LABELS,
  can,
  type Grant,
} from '@/permission-engine';

/*
 * The three roles as the organisation described them, stated as the
 * lines each may not cross. If a capability is ever added without a
 * home, the last case catches it.
 */
const admin: Grant = { role: 'owner', eventSlug: null };
const supervisor: Grant = { role: 'producer', eventSlug: null };
const staff: Grant = { role: 'editor', eventSlug: null };

describe('the three Netaim roles', () => {
  it('offers exactly three roles, under their Netaim names', () => {
    expect([...ASSIGNABLE_ROLES]).toEqual(['owner', 'producer', 'editor']);
    expect(ROLE_LABELS.owner.he).toBe('מנהל Netaim');
    expect(ROLE_LABELS.producer.he).toBe('מפקח Netaim');
    expect(ROLE_LABELS.editor.he).toBe('צוות Netaim');
  });

  it('the admin holds every capability there is', () => {
    for (const capability of CAPABILITIES) {
      expect(can([admin], capability), capability).toBe(true);
    }
  });

  it('the supervisor works on everything but may not destroy, grant, or read the log', () => {
    for (const allowed of [
      'events:manage', 'activities:manage', 'activities:archive',
      'registrations:manage', 'participants:manage', 'logistics:manage', 'communications:manage',
    ] as const) {
      expect(can([supervisor], allowed), allowed).toBe(true);
    }
    for (const forbidden of [
      'events:delete', 'activities:delete', 'participants:delete',
      'access:manage', 'audit:read', 'platform:manage',
    ] as const) {
      expect(can([supervisor], forbidden), forbidden).toBe(false);
    }
  });

  it('staff see and shape the program and look at logistics, and nothing more', () => {
    for (const allowed of ['activities:read', 'activities:manage', 'logistics:read', 'content:read'] as const) {
      expect(can([staff], allowed), allowed).toBe(true);
    }
    for (const forbidden of [
      'activities:archive', 'activities:delete', 'events:manage', 'logistics:manage',
      'participants:read', 'registrations:manage', 'communications:manage', 'audit:read', 'access:manage',
    ] as const) {
      expect(can([staff], forbidden), forbidden).toBe(false);
    }
  });

  it('a legacy door or viewer grant still opens, but only to read', () => {
    expect(can([{ role: 'door', eventSlug: null }], 'participants:read')).toBe(true);
    expect(can([{ role: 'door', eventSlug: null }], 'activities:manage')).toBe(false);
    expect(can([{ role: 'viewer', eventSlug: null }], 'activities:read')).toBe(true);
    expect(can([{ role: 'viewer', eventSlug: null }], 'events:manage')).toBe(false);
  });

  it('every capability belongs to at least the admin, and every role bundle names real capabilities', () => {
    for (const bundle of Object.values(ROLE_CAPABILITIES)) {
      for (const capability of bundle) {
        expect(CAPABILITIES).toContain(capability);
      }
    }
    expect(new Set(ROLE_CAPABILITIES.owner).size).toBe(CAPABILITIES.length);
  });
});
