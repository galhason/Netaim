import {
  connectionRepository,
  participantSessionRepository,
  registrationRepository,
} from '@/infrastructure';
import { currentParticipant, resolveConnectToken } from '@/features/registration';
import {
  manageConnection,
  respondToConnection,
  type ConnectionManageAction,
  type ConnectionResponse,
} from '@/networking-engine';
import type { ConnectionSummary, MyConnection } from '../types/connection';

export const requestConnection = async (
  slug: string,
  addresseeId: string,
  message?: string,
): Promise<ConnectionSummary | null> => {
  const me = await currentParticipant();
  if (!me || me.id === addresseeId) {
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
  return connectionRepository.create(slug, me.id, addresseeId, message);
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
  const result = respondToConnection(connection.status, response);
  if (!result.ok) {
    return connection;
  }
  return connectionRepository.setStatus(connectionId, result.status);
};

/*
 * Connection Framework v1.0: what an accepted connection actually
 * opens. HASON Messages is always on; every other channel obeys the
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
 * QR Connect: a scanned badge token becomes a connection request in the
 * first conference both participants belong to. The token holds only a
 * signed identifier; everything personal waits for approval.
 */
export type QrConnectResult =
  | { ok: true; slug: string }
  | { ok: false; reason: 'signedOut' | 'invalid' | 'self' | 'noShared' };

export const connectToParticipant = async (
  targetId: string,
  message?: string,
): Promise<QrConnectResult> => {
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
  const empty: string[] = [];
  const [mySlugs, theirSlugs] = await Promise.all([
    registrationRepository.eventSlugsForParticipant(me.id).catch(() => empty),
    registrationRepository
      .eventSlugsForParticipant(targetId)
      .catch(() => empty),
  ]);
  const shared = mySlugs.find((slug) => theirSlugs.includes(slug));
  if (!shared) {
    return { ok: false, reason: 'noShared' };
  }
  await requestConnection(shared, targetId, message);
  return { ok: true, slug: shared };
};

export const connectByToken = async (
  token: string,
  message?: string,
): Promise<QrConnectResult> => {
  const target = await resolveConnectToken(token);
  if (!target) {
    return { ok: false, reason: 'invalid' };
  }
  return connectToParticipant(target.id, message);
};

/*
 * What a scanned badge shows before anything happens: the public card
 * only — name, organization, role, portrait. Nothing personal leaves
 * until the other side approves.
 */
export interface ConnectPreview {
  name: string;
  orgName?: string;
  roleTitle?: string;
  photoUrl?: string;
  self: boolean;
  signedIn: boolean;
}

export const connectPreview = async (
  token: string,
): Promise<ConnectPreview | null> => {
  const target = await resolveConnectToken(token);
  if (!target) {
    return null;
  }
  const me = await currentParticipant().catch(() => null);
  const details = await participantSessionRepository
    .participantDetails(target.id)
    .catch(() => null);
  return {
    name: target.name,
    orgName: details?.organization,
    roleTitle: details?.role,
    photoUrl: details?.photoUrl,
    self: me?.id === target.id,
    signedIn: Boolean(me),
  };
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
    'NOTE:Hason',
    'END:VCARD',
  ].join('\r\n');
  return { fileName: `contact-${connection.id}.vcf`, vcard };
};

export const myConnections = async (
  slug: string,
): Promise<MyConnection[]> => {
  const me = await currentParticipant();
  if (!me) {
    return [];
  }
  const list = await connectionRepository.listForParticipant(slug, me.id);
  return list.map((connection) => {
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
