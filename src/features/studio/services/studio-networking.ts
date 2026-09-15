import type { Locale } from '@/config/locales';
import { getActiveConferenceSlug } from '@/features/events';
import {
  listDirectoryParticipants,
  networkingEventBoard,
  type StudioConnectionRow,
  type StudioMeetingRow,
} from '@/infrastructure';

/*
 * The numbers behind the community screen, gathered once per request.
 *
 * Everything is derived from the same sources the public page reads —
 * the consent-filtered directory listing and the event's own
 * connection and meeting records — so the Studio can never claim a
 * community the page would not show. Two deliberate silences: chat
 * appears only as a count, and a muted connection is reported as an
 * ordinary accepted one, because mute is private to the person who
 * muted (Connection Framework v1.0) and the operators are not inside
 * that privacy either.
 */
export interface StudioNetworkingView {
  slug: string;
  listed: number;
  openToMeetings: number;
  activeConnections: number;
  pendingRequests: number;
  plannedMeetings: number;
  messages: number;
  recentConnections: StudioConnectionRow[];
  meetings: StudioMeetingRow[];
}

const RECENT_LIMIT = 10;
const MEETINGS_LIMIT = 10;

export const getStudioNetworking = async (
  locale: Locale,
): Promise<StudioNetworkingView | null> => {
  const slug = await getActiveConferenceSlug(locale).catch(() => null);
  if (!slug) {
    return null;
  }
  const [board, people] = await Promise.all([
    networkingEventBoard(slug).catch(() => ({
      connections: [],
      meetings: [],
      messages: 0,
    })),
    listDirectoryParticipants(slug).catch(() => []),
  ]);

  const active = board.connections.filter(
    (row) => row.status === 'accepted' || row.status === 'muted',
  );
  const pending = board.connections.filter((row) => row.status === 'pending');

  return {
    slug,
    listed: people.length,
    openToMeetings: people.filter((person) => person.openToMeetings).length,
    activeConnections: active.length,
    pendingRequests: pending.length,
    plannedMeetings: board.meetings.filter(
      (meeting) => meeting.status !== 'cancelled',
    ).length,
    messages: board.messages,
    recentConnections: board.connections
      .filter((row) => row.status !== 'removed')
      .slice(0, RECENT_LIMIT)
      /* mute is private: the panel sees an ordinary connection */
      .map((row) =>
        row.status === 'muted' ? { ...row, status: 'accepted' as const } : row,
      ),
    meetings: board.meetings.slice(0, MEETINGS_LIMIT),
  };
};
