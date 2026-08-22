import type { ConnectionStatus } from './connection-status';

export type ConnectionResponse = 'accept' | 'decline';

export interface ConnectionTransitionResult {
  ok: boolean;
  status: ConnectionStatus;
}

/*
 * A connection request is a one-shot decision: only the addressee, and
 * only while pending, may accept or decline (Networking-Architecture
 * Layer 2). Declined is terminal; an accepted connection continues to
 * the lifecycle below (Connection Framework v1.0).
 */
export const canRespond = (status: ConnectionStatus): boolean =>
  status === 'pending';

/*
 * The living connection's lifecycle: Connected → Muted → Removed.
 * Mute is reversible; removed behaves like never-connected (a fresh
 * request may follow). Pure decisions only — who may mute is the
 * application layer's concern.
 */
export type ConnectionManageAction =
  | 'mute'
  | 'unmute'
  | 'remove'
  | 'withdraw';

export const manageConnection = (
  status: ConnectionStatus,
  action: ConnectionManageAction,
): ConnectionTransitionResult => {
  if (action === 'mute' && status === 'accepted') {
    return { ok: true, status: 'muted' };
  }
  if (action === 'unmute' && status === 'muted') {
    return { ok: true, status: 'accepted' };
  }
  if (action === 'remove' && (status === 'accepted' || status === 'muted')) {
    return { ok: true, status: 'removed' };
  }
  /*
   * Taking back a request nobody has answered yet.
   *
   * `remove` deliberately refuses a pending connection — removing is
   * something you do to a relationship that exists. But that left a
   * request with no way out at all: the sender could not withdraw it and
   * the receiver was under no obligation to answer, so it sat in both
   * lists forever. Whoever sent it should be able to change their mind.
   *
   * It lands on `removed` rather than `declined`, because nobody
   * declined anything — and `removed` frees the pair to try again.
   */
  if (action === 'withdraw' && status === 'pending') {
    return { ok: true, status: 'removed' };
  }
  return { ok: false, status };
};

export const respondToConnection = (
  status: ConnectionStatus,
  response: ConnectionResponse,
): ConnectionTransitionResult => {
  if (!canRespond(status)) {
    return { ok: false, status };
  }
  return { ok: true, status: response === 'accept' ? 'accepted' : 'declined' };
};

/*
 * An order-independent key for a pair of participants, so the application
 * layer can enforce at most one active connection per pair.
 */
export const pairKey = (a: string, b: string): string => [a, b].sort().join(':');
