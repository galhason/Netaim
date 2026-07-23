import { chatRepository, connectionRepository } from '@/infrastructure';
import { currentParticipant } from '@/features/registration';
import type { ChatMessage } from '../types/chat';

/*
 * HASON Messages, person to person (Connection Framework v1.0): the
 * channel every accepted connection always has. Deny by default — only
 * a member of a living (accepted or muted) connection reads or writes,
 * and mute never blocks words, only noise.
 */
const THREAD_LIMIT = 200;
const MAX_BODY = 2000;

export interface ChatThread {
  connectionId: string;
  otherId: string;
  otherName: string;
  messages: (ChatMessage & { mine: boolean })[];
}

const livingConnectionFor = async (connectionId: string, meId: string) => {
  const connection = await connectionRepository.getById(connectionId);
  if (
    !connection ||
    (connection.status !== 'accepted' && connection.status !== 'muted') ||
    (connection.requesterId !== meId && connection.addresseeId !== meId)
  ) {
    return null;
  }
  return connection;
};

export const myChatThread = async (
  connectionId: string,
): Promise<ChatThread | null> => {
  const me = await currentParticipant();
  if (!me) {
    return null;
  }
  const connection = await livingConnectionFor(connectionId, me.id);
  if (!connection) {
    return null;
  }
  const messages = await chatRepository.listForConnection(
    connectionId,
    THREAD_LIMIT,
  );
  /* opening the thread is reading it */
  await chatRepository.markRead(connectionId, me.id).catch(() => undefined);
  const outgoing = connection.requesterId === me.id;
  return {
    connectionId,
    otherId: outgoing ? connection.addresseeId : connection.requesterId,
    otherName: outgoing ? connection.addresseeName : connection.requesterName,
    messages: messages.map((message) => ({
      ...message,
      mine: message.senderId === me.id,
    })),
  };
};

export const sendChatMessage = async (
  connectionId: string,
  body: string,
): Promise<boolean> => {
  const me = await currentParticipant();
  if (!me) {
    return false;
  }
  const text = body.trim().slice(0, MAX_BODY);
  if (!text) {
    return false;
  }
  const connection = await livingConnectionFor(connectionId, me.id);
  if (!connection) {
    return false;
  }
  const sent = await chatRepository.send(connectionId, me.id, text);
  return sent !== null;
};

/*
 * Unread words per connection, for badges and bells. Muted-by-me
 * connections stay quiet: the words wait, the counter does not shout.
 */
export const myUnreadByConnection = async (
  connections: { id: string; muted?: boolean }[],
): Promise<Map<string, number>> => {
  const me = await currentParticipant();
  const counts = new Map<string, number>();
  if (!me) {
    return counts;
  }
  await Promise.all(
    connections.map(async (connection) => {
      if (connection.muted) {
        counts.set(connection.id, 0);
        return;
      }
      const count = await chatRepository
        .unreadCount(connection.id, me.id)
        .catch(() => 0);
      counts.set(connection.id, count);
    }),
  );
  return counts;
};
