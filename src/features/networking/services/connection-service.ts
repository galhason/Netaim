import { BRAND_LATIN } from '@/config/brand';
import {
  connectionRepository,
  participantSessionRepository,
  registrationRepository,
} from '@/infrastructure';
import { checkRateLimit } from '@/features/access';
import { currentParticipant } from '@/features/registration';
import {
  manageConnection,
  respondToConnection,
  type ConnectionManageAction,
  type ConnectionResponse,
} from '@/networking-engine';
import type { ConnectionSummary, MyConnection } from '../types/connection';
import {
  noticeConnectionAccepted,
  noticeConnectionRequested,
} from './networking-notices';
import { blockedBetween, myHiddenParticipantIds } from './safety-service';

export const requestConnection = async (
  slug: string,
  addresseeId: string,
  message?: string,
): Promise<ConnectionSummary | null> => {
  const me = await currentParticipant();
  if (!me || me.id === addresseeId) {
    return null;
  }
  /*
   * The conference is proof that these two share a room, so it cannot be
   * taken on the form's word. It arrives from a hidden input, and a
   * request filed in a conference neither party attends would reach
   * someone who never agreed to be reachable — and would sit in their
   * list under the name of an event they have nothing to do with.
   *
   * The QR path already resolved the shared conference on the server;
   * this is the same rule for the path that did not.
   *
   * Participation is asked for the way the directory asks it — a live
   * place in one of the conference's activities, or a live event-level
   * registration. Reading only the second one meant the directory and
   * this gate disagreed: a guest who had signed up for workshops was
   * listed among the people to meet, and refused the moment they tried.
   */
  const [mine, theirs] = await Promise.all([
    registrationRepository
      .conferenceSlugsForParticipant(me.id)
      .catch((): string[] => []),
    registrationRepository
      .conferenceSlugsForParticipant(addresseeId)
      .catch((): string[] => []),
  ]);
  if (!mine.includes(slug) || !theirs.includes(slug)) {
    return null;
  }
  /*
   * A block is checked here rather than only in the interface: this is
   * the one place every request path passes through, and the whole
   * point of blocking is that no hand-shaped form gets around it.
   */
  if (await blockedBetween(me.id, addresseeId)) {
    return null;
  }
  const existing = await connectionRepository.findActiveBetween(
    slug,
    me.id,
    addresseeId,
  );
  if (existing) {
    return existing;
  }
  /*
   * Counted only once every gate has passed and a genuinely new request
   * is about to be filed: re-opening a thread you already have, or
   * being refused by the block rule, must not spend the allowance. A
   * person working the room hard sends a few dozen invitations in an
   * hour; a script sends hundreds, and each one lands as a
   * notification in somebody's evening.
   */
  const pace = await checkRateLimit('connection-request', me.id);
  if (!pace.allowed) {
    return null;
  }
  const created = await connectionRepository.create(
    slug,
    me.id,
    addresseeId,
    message,
  );
  /*
   * Told, never blocked: the connection stands whether or not the note
   * reaches them.
   */
  await noticeConnectionRequested(slug, addresseeId, me.name);
  return created;
};

export const respondToRequest = async (
  connectionId: string,
  response: ConnectionResponse,
): Promise<ConnectionSummary | null> => {
  const me = await currentParticipant();
  if (!me) {
    return null;
  }
  const connection = await connectionRepository.getById(connectionId);
  if (!connection || connection.addresseeId !== me.id) {
    return null;
  }
  if (
    response === 'accept' &&
    (await blockedBetween(me.id, connection.requesterId))
  ) {
    return null;
  }
  const result = respondToConnection(connection.status, response);
  if (!result.ok) {
    return connection;
  }
  const updated = await connectionRepository.setStatus(
    connectionId,
    result.status,
  );
  /*
   * Only acceptance is announced. A decline is a quiet no — telling
   * someone they were turned down adds nothing they can act on, and the
   * request simply leaving their list says it gently enough.
   */
  if (result.status === 'accepted') {
    await noticeConnectionAccepted(
      connection.slug,
      connection.requesterId,
      me.name,
    );
  }
  return updated;
};

/*
 * Connection Framework v1.0: what an accepted connection actually
 * opens. Netaim Messages is always on; every other channel obeys the
 * OTHER side's own preferences, re-read on every call so a change
 * applies immediately. Deny by default at every step.
 */
export interface ConnectionChannels {
  connectionId: string;
  otherId: string;
  otherName: string;
  whatsapp: boolean;
  phone: string | null;
  email: string | null;
  meetings: boolean;
}

const memberOf = (
  connection: { requesterId: string; addresseeId: string },
  meId: string,
): boolean =>
  connection.requesterId === meId || connection.addresseeId === meId;

const otherOf = (
  connection: { requesterId: string; addresseeId: string },
  meId: string,
): string =>
  connection.requesterId === meId
    ? connection.addresseeId
    : connection.requesterId;

export const connectionChannels = async (
  connectionId: string,
): Promise<ConnectionChannels | null> => {
  const me = await currentParticipant();
  if (!me) {
    return null;
  }
  const connection = await connectionRepository.getById(connectionId);
  /* muted is still connected — mute silences, it never severs */
  if (
    !connection ||
    (connection.status !== 'accepted' && connection.status !== 'muted') ||
    !memberOf(connection, me.id)
  ) {
    return null;
  }
  const otherId = otherOf(connection, me.id);
  if (await blockedBetween(me.id, otherId)) {
    return null;
  }
  const other = await participantSessionRepository.contactProfileById(otherId);
  if (!other) {
    return null;
  }
  return {
    connectionId,
    otherId,
    otherName: other.name,
    whatsapp: other.prefs.whatsapp && Boolean(other.phone),
    phone: other.prefs.phone ? (other.phone ?? null) : null,
    email: other.prefs.email ? other.email : null,
    meetings: other.prefs.meetings,
  };
};

/*
 * The living connection's controls (Connection Framework v1.0): mute is
 * private and reversible only by the muter; remove frees the pair to
 * meet again someday. Deny by default at every step.
 */
export const manageMyConnection = async (
  connectionId: string,
  action: ConnectionManageAction,
): Promise<boolean> => {
  const me = await currentParticipant();
  if (!me) {
    return false;
  }
  const connection = await connectionRepository.getById(connectionId);
  if (!connection || !memberOf(connection, me.id)) {
    return false;
  }
  if (action === 'unmute' && connection.mutedBy && connection.mutedBy !== me.id) {
    return false;
  }
  /*
   * Only the person who asked may take the question back. For the
   * addressee the answer is decline, which is a different act and says a
   * different thing to the other side.
   */
  if (action === 'withdraw' && connection.requesterId !== me.id) {
    return false;
  }
  const result = manageConnection(connection.status, action);
  if (!result.ok) {
    return false;
  }
  await connectionRepository.setStatus(
    connectionId,
    result.status,
    action === 'mute' ? me.id : null,
  );
  return true;
};

/*
 * The WhatsApp door: opens a conversation without ever printing the
 * number in the UI. The number leaves the server only inside the
 * wa.me redirect, and only when the other side allowed the channel.
 */
export const whatsappLinkFor = async (
  connectionId: string,
): Promise<string | null> => {
  const channels = await connectionChannels(connectionId);
  if (!channels || !channels.whatsapp) {
    return null;
  }
  const other = await participantSessionRepository.contactProfileById(
    channels.otherId,
  );
  const raw = other?.phone ?? '';
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0')) {
    digits = `972${digits.slice(1)}`;
  }
  return digits.length >= 8 ? `https://wa.me/${digits}` : null;
};

/*
 * The contact card (vision: a connection you keep): once both sides
 * said yes, either side may download the other as a vCard. It carries
 * only the channels the other side opened — never more.
 */
export interface ContactCard {
  fileName: string;
  vcard: string;
}

const escapeVCard = (value: string): string =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/[,;]/g, (match) => `\\${match}`)
    .replace(/\r?\n/g, '\\n');

export const connectionContactCard = async (
  connectionId: string,
): Promise<ContactCard | null> => {
  const me = await currentParticipant();
  if (!me) {
    return null;
  }
  const connection = await connectionRepository.getById(connectionId);
  if (
    !connection ||
    (connection.status !== 'accepted' && connection.status !== 'muted')
  ) {
    return null;
  }
  const isMine =
    connection.requesterId === me.id || connection.addresseeId === me.id;
  if (!isMine) {
    return null;
  }
  const otherId = otherOf(connection, me.id);
  if (await blockedBetween(me.id, otherId)) {
    return null;
  }
  const other = await participantSessionRepository.contactProfileById(otherId);
  if (!other) {
    return null;
  }
  const vcard = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${escapeVCard(other.name)}`,
    `N:${escapeVCard(other.name)};;;;`,
    ...(other.prefs.email
      ? [`EMAIL;TYPE=INTERNET:${escapeVCard(other.email)}`]
      : []),
    ...(other.prefs.phone && other.phone
      ? [`TEL;TYPE=CELL:${escapeVCard(other.phone)}`]
      : []),
    `NOTE:${BRAND_LATIN}`,
    'END:VCARD',
  ].join('\r\n');
  return { fileName: `contact-${connection.id}.vcf`, vcard };
};

/*
 * Connecting from the directory: the first conference both participants
 * belong to is resolved on the server, so the request is always filed in
 * a room they actually share.
 *
 * This once had a second entrance — a signed badge token, scanned from a
 * QR code. It was withdrawn as a product decision: a printed handle that
 * never expired and could not be revoked, for a gesture two taps in the
 * directory already do.
 */
export type ConnectResult =
  | { ok: true; slug: string }
  | {
      ok: false;
      reason: 'signedOut' | 'invalid' | 'self' | 'noShared' | 'blocked';
    };

export const connectToParticipant = async (
  targetId: string,
  message?: string,
): Promise<ConnectResult> => {
  const me = await currentParticipant();
  if (!me) {
    return { ok: false, reason: 'signedOut' };
  }
  if (!targetId) {
    return { ok: false, reason: 'invalid' };
  }
  if (targetId === me.id) {
    return { ok: false, reason: 'self' };
  }
  if (await blockedBetween(me.id, targetId)) {
    return { ok: false, reason: 'blocked' };
  }
  const empty: string[] = [];
  const [mySlugs, theirSlugs] = await Promise.all([
    registrationRepository
      .conferenceSlugsForParticipant(me.id)
      .catch(() => empty),
    registrationRepository
      .conferenceSlugsForParticipant(targetId)
      .catch(() => empty),
  ]);
  const shared = mySlugs.find((slug) => theirSlugs.includes(slug));
  if (!shared) {
    return { ok: false, reason: 'noShared' };
  }
  await requestConnection(shared, targetId, message);
  return { ok: true, slug: shared };
};

export const myConnections = async (
  slug: string,
): Promise<MyConnection[]> => {
  const me = await currentParticipant();
  if (!me) {
    return [];
  }
  const [list, hidden] = await Promise.all([
    connectionRepository.listForParticipant(slug, me.id),
    myHiddenParticipantIds(),
  ]);
  return list
    .filter((connection) => {
      /*
       * Hidden from both sides, deliberately. The blocked person sees
       * the connection simply gone — which is what removal looks like
       * too, and so proves nothing about who did what.
       */
      const other =
        connection.requesterId === me.id
          ? connection.addresseeId
          : connection.requesterId;
      return !hidden.has(other);
    })
    .map((connection) => {
      const outgoing = connection.requesterId === me.id;
      const mutedByMe =
        connection.status === 'muted' && connection.mutedBy === me.id;
      return {
        ...connection,
        /*
         * Mute is private: to the side that did not mute, the connection
         * stays plainly accepted — nothing should ever be surprising.
         */
        status:
          connection.status === 'muted' && !mutedByMe
            ? 'accepted'
            : connection.status,
        muted: mutedByMe,
        direction: outgoing ? 'outgoing' : 'incoming',
        otherId: outgoing ? connection.addresseeId : connection.requesterId,
        otherName: outgoing
          ? connection.addresseeName
          : connection.requesterName,
      };
    });
};
