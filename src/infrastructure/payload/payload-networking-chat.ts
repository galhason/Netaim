import { relationshipId } from '@/auth';
import type {
  ChatMessage,
  ChatRepository,
} from '@/features/networking/types/chat';
import { getSystemPayload } from './payload-context';

interface ChatRow {
  id: number | string;
  sender?: number | string | { id: number | string };
  body?: string | null;
  createdAt?: string;
  readAt?: string | null;
}

const toMessage = (row: ChatRow): ChatMessage => ({
  id: String(row.id),
  senderId: String(relationshipId(row.sender ?? null) ?? ''),
  body: row.body ?? '',
  createdAt: row.createdAt,
  readAt: row.readAt ?? undefined,
});

/*
 * The chat adapter. System reads are participant self-service: the
 * connection service has already proven membership and an accepted
 * connection before any call lands here.
 */
export const payloadChatRepository: ChatRepository = {
  listForConnection: async (connectionId, limit) => {
    const payload = await getSystemPayload();
    const result = await payload.find({
      collection: 'networking-chat-messages',
      where: { connection: { equals: Number(connectionId) } },
      sort: '-createdAt',
      limit,
      depth: 0,
      overrideAccess: true,
    });
    return (result.docs as unknown as ChatRow[]).map(toMessage).reverse();
  },

  send: async (connectionId, senderId, body) => {
    const payload = await getSystemPayload();
    const connection = await payload
      .findByID({
        collection: 'networking-connections',
        id: connectionId,
        depth: 0,
        overrideAccess: true,
      })
      .catch(() => null);
    const organization = connection
      ? Number(
          relationshipId(
            (connection as { organization: number | string | { id: number | string } })
              .organization,
          ),
        )
      : NaN;
    if (Number.isNaN(organization)) {
      return null;
    }
    const doc = await payload.create({
      collection: 'networking-chat-messages',
      data: {
        organization,
        connection: Number(connectionId),
        sender: Number(senderId),
        body,
      },
      depth: 0,
      overrideAccess: true,
    });
    return toMessage(doc as unknown as ChatRow);
  },

  markRead: async (connectionId, readerId) => {
    const payload = await getSystemPayload();
    await payload.update({
      collection: 'networking-chat-messages',
      where: {
        and: [
          { connection: { equals: Number(connectionId) } },
          { sender: { not_equals: Number(readerId) } },
          { readAt: { exists: false } },
        ],
      },
      data: { readAt: new Date().toISOString() },
      overrideAccess: true,
    });
  },

  unreadCount: async (connectionId, readerId) => {
    const payload = await getSystemPayload();
    const result = await payload.count({
      collection: 'networking-chat-messages',
      where: {
        and: [
          { connection: { equals: Number(connectionId) } },
          { sender: { not_equals: Number(readerId) } },
          { readAt: { exists: false } },
        ],
      },
      overrideAccess: true,
    });
    return result.totalDocs;
  },
};
