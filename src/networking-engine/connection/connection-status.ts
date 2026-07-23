export const CONNECTION_STATUSES = [
  'pending',
  'accepted',
  'declined',
  'muted',
  'removed',
] as const;

export type ConnectionStatus = (typeof CONNECTION_STATUSES)[number];

export const isConnectionStatus = (value: string): value is ConnectionStatus =>
  (CONNECTION_STATUSES as readonly string[]).includes(value);
