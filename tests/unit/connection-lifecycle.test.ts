import { describe, expect, it } from 'vitest';
import {
  manageConnection,
  respondToConnection,
} from '@/networking-engine';

/*
 * Connection Framework v1.0: Not Connected → Request Sent → Connected →
 * Muted → Removed. Mute is reversible; removed frees the pair; nothing
 * moves from a state that does not allow it.
 */
describe('connection lifecycle', () => {
  it('accepts and declines only while pending', () => {
    expect(respondToConnection('pending', 'accept')).toEqual({
      ok: true,
      status: 'accepted',
    });
    expect(respondToConnection('accepted', 'decline').ok).toBe(false);
    expect(respondToConnection('removed', 'accept').ok).toBe(false);
  });

  it('mutes a connected pair and unmutes back', () => {
    expect(manageConnection('accepted', 'mute')).toEqual({
      ok: true,
      status: 'muted',
    });
    expect(manageConnection('muted', 'unmute')).toEqual({
      ok: true,
      status: 'accepted',
    });
    expect(manageConnection('pending', 'mute').ok).toBe(false);
    expect(manageConnection('accepted', 'unmute').ok).toBe(false);
  });

  it('removes from connected or muted, never from anywhere else', () => {
    expect(manageConnection('accepted', 'remove')).toEqual({
      ok: true,
      status: 'removed',
    });
    expect(manageConnection('muted', 'remove')).toEqual({
      ok: true,
      status: 'removed',
    });
    expect(manageConnection('removed', 'remove').ok).toBe(false);
    expect(manageConnection('declined', 'remove').ok).toBe(false);
  });
});
