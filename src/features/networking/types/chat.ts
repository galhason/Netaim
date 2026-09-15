/*
 * Netaim Messages between two connected people. The repository speaks
 * connection ids only; who may read what is the service's law.
 */
export interface ChatMessage {
  id: string;
  senderId: string;
  body: string;
  createdAt?: string;
  readAt?: string;
}

export interface ChatRepository {
  listForConnection: (
    connectionId: string,
    limit: number,
  ) => Promise<ChatMessage[]>;
  /*
   * Everything said after a message the reader already has, oldest
   * first. The whole point of the cursor is that an open thread asking
   * every few seconds usually gets an empty array back — re-sending two
   * hundred messages to discover that nothing happened is what makes
   * polling expensive enough to have to do slowly.
   */
  listSince: (
    connectionId: string,
    afterId: string,
    limit: number,
  ) => Promise<ChatMessage[]>;
  send: (
    connectionId: string,
    senderId: string,
    body: string,
  ) => Promise<ChatMessage | null>;
  /* stamp everything the reader had not seen from the other side */
  markRead: (connectionId: string, readerId: string) => Promise<void>;
  unreadCount: (connectionId: string, readerId: string) => Promise<number>;
}
