import { getActiveConferenceSlug } from '@/features/events';
import { myConnections, myUnreadByConnection } from '@/features/networking';
import {
  feedItemHref,
  listMyFeed,
  newsworthyInLocale,
  noticeIconOf,
} from '@/features/notifications';
import { currentParticipant } from '@/features/registration';
import { isSupportedLocale, type Locale } from '@/config/locales';

/*
 * What the bell in the navigation asks, every half minute or so.
 *
 * Three kinds of news, and only three: what the production announced
 * from its panel, who asked to connect, and how many chat messages are
 * waiting — as one number on purpose, because a person in a hallway
 * needs "3 new messages", not three separate pings. Everything is read
 * through the same services the pages themselves use, so the bell can
 * never know something the page would not show.
 *
 * Nothing here is cacheable and nothing is shared: the answer depends
 * entirely on the cookie that arrived with the request.
 */
export const dynamic = 'force-dynamic';

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });

const FEED_LIMIT = 8;

export const GET = async (
  _request: Request,
  context: { params: Promise<{ locale: string }> },
) => {
  const { locale: raw } = await context.params;
  const locale: Locale = isSupportedLocale(raw) ? (raw as Locale) : 'he';

  const me = await currentParticipant().catch(() => null);
  if (!me) {
    return json({ signedOut: true }, 401);
  }
  const slug = await getActiveConferenceSlug(locale).catch(() => null);
  if (!slug) {
    return json({ items: [], requests: 0, unread: 0 });
  }

  const [feed, connections] = await Promise.all([
    listMyFeed(slug).catch(() => []),
    myConnections(slug).catch(
      () => [] as Awaited<ReturnType<typeof myConnections>>,
    ),
  ]);

  /*
   * Personal notes are written once per language; broadcasts arrive as
   * one row per language too. The bell serves only the reader's own.
   */
  const items = newsworthyInLocale(feed, locale)
    .slice(0, FEED_LIMIT)
    .map((entry) => ({
      id: entry.id,
      type: entry.type,
      icon: noticeIconOf(entry.type),
      subject: entry.subject,
      body: entry.body,
      at: entry.createdAt ?? null,
      /* Where a click lands — the same rule the messages page uses. */
      href: feedItemHref(entry.type, locale, slug),
    }));

  const requests = connections.filter(
    (connection) =>
      connection.status === 'pending' && connection.direction === 'incoming',
  ).length;

  const accepted = connections.filter(
    (connection) => connection.status === 'accepted' || connection.muted,
  );
  const unreadByConnection = await myUnreadByConnection(accepted).catch(
    () => new Map<string, number>(),
  );
  const unread = [...unreadByConnection.values()].reduce(
    (sum, count) => sum + count,
    0,
  );

  return json({ items, requests, unread });
};
