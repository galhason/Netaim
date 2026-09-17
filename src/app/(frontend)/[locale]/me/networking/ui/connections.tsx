import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Locale } from '@/config/locales';
import type { ConnectionChannels, MyConnection } from '@/features/networking';
import type { FellowParticipant } from '@/infrastructure';
import { manageConnectionAction } from '../actions';
import SafetyMenu from './safety-menu';
import { RingedAvatar, personLine } from './shared';

/*
 * "My connections" — the people already reached, drawn in the same
 * bubble language as the discovery rail above: a ringed face on the
 * warm page itself, no card around it.
 *
 * The section is count-aware, because a network is not always a crowd:
 * zero connections is an invitation, one is a spotlight, two to four
 * are a huddle in the middle of the page, five and up become a rail.
 * Every state is laid out on purpose — a single real person must never
 * look like eleven missing ones. The counting happens at render time
 * from the list the server already fetched; no new data, no client
 * state, no JavaScript required.
 *
 * The privacy rule predates this design and outranks it: only the
 * channels the other person actually opened appear; a closed one
 * renders nothing at all, never a greyed-out button — a disabled phone
 * icon still tells you they have a number and chose to keep it.
 */

const COPY = {
  title: { he: 'החיבורים שלי', en: 'My Connections' },
  one: { he: 'חיבור אחד', en: '1 connection' },
  many: { he: 'חיבורים', en: 'connections' },
  message: { he: 'הודעה', en: 'Message' },
  email: { he: 'אימייל', en: 'Email' },
  openLine: { he: 'פתוח/ה לפגישות', en: 'Open to meetings' },
  muted: { he: 'מושתק', en: 'Muted' },
  mute: { he: 'השתקה', en: 'Mute' },
  unmute: { he: 'ביטול השתקה', en: 'Unmute' },
  remove: { he: 'הסרת הקשר', en: 'Remove connection' },
  emptyTitle: { he: 'אין לך חיבורים עדיין', en: 'No connections yet' },
  emptyBody: {
    he: 'מצאו אנשים שמעניין אתכם להכיר והתחילו להתחבר.',
    en: 'Discover people you may want to meet and start connecting.',
  },
  morePeople: { he: 'רוצים להכיר עוד אנשים?', en: 'Want to meet more people?' },
  discover: { he: 'גילוי אנשים', en: 'Discover people' },
} as const;

/* Channel pills: real, open channels only — compact and secondary. */
const contactPill =
  'inline-flex min-h-8 items-center rounded-full border border-[var(--n-hair)] bg-white/70 px-3 text-[11.5px] font-medium transition-colors hover:border-[var(--n-gold)]';

const quietAction =
  'n-quiet-link';

const ChatIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className="size-4"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 11.5c0 4.1-3.6 7-8 7-1 0-2-.15-2.9-.44L4.5 19.5l1.3-3.4A6.7 6.7 0 0 1 4 11.5c0-4.1 3.6-7 8-7s8 2.9 8 7z" />
  </svg>
);

const DiscoverIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className="size-4"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="10" cy="8" r="3.25" />
    <path d="M4.5 19c.6-3 2.8-4.5 5.5-4.5s4.9 1.5 5.5 4.5M18 8v6M15 11h6" />
  </svg>
);

type Row = MyConnection & { slug: string; title: string };

const MessageButton = ({
  locale,
  he,
  num,
  connection,
  count,
  wide,
}: {
  locale: Locale;
  he: boolean;
  num: (value: number) => string;
  connection: Row;
  count: number;
  wide?: boolean;
}) => (
  <Link
    href={`/${locale}/me/chat/${connection.id}`}
    className={`relative inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[var(--n-navy)] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[var(--n-deep)] ${
      wide ? 'min-h-11 w-56 max-w-full text-sm' : 'w-full'
    }`}
  >
    <ChatIcon />
    {he ? COPY.message.he : COPY.message.en}
    {count > 0 ? (
      /* The real unread count, riding the pill's corner. */
      <span className="absolute -end-1 -top-1.5 grid min-w-[1.15rem] place-items-center rounded-full border-2 border-[var(--n-bg)] bg-[var(--n-purple)] px-1 py-px text-[10px] font-semibold tabular-nums text-white">
        {num(count)}
      </span>
    ) : null}
  </Link>
);

const ChannelRow = ({
  locale,
  he,
  connection,
  channels,
}: {
  locale: Locale;
  he: boolean;
  connection: Row;
  channels: ConnectionChannels | null | undefined;
}) =>
  channels && (channels.whatsapp || channels.phone || channels.email) ? (
    <p className="mt-2 flex flex-wrap justify-center gap-1.5">
      {channels.whatsapp ? (
        <a
          href={`/${locale}/me/wa/${connection.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className={contactPill}
        >
          WhatsApp
        </a>
      ) : null}
      {channels.phone ? (
        <a href={`tel:${channels.phone}`} dir="ltr" className={contactPill}>
          {channels.phone}
        </a>
      ) : null}
      {channels.email ? (
        <a href={`mailto:${channels.email}`} className={contactPill}>
          {he ? COPY.email.he : COPY.email.en}
        </a>
      ) : null}
    </p>
  ) : null;

const QuietActions = ({
  locale,
  he,
  connection,
  className,
}: {
  locale: Locale;
  he: boolean;
  connection: Row;
  className: string;
}) => (
  <span className={`flex items-center gap-1.5 text-[10.5px] text-[var(--n-faint)] ${className}`}>
    <form action={manageConnectionAction}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="slug" value={connection.slug} />
      <input type="hidden" name="connectionId" value={connection.id} />
      <input
        type="hidden"
        name="manage"
        value={connection.muted ? 'unmute' : 'mute'}
      />
      <button type="submit" className={quietAction}>
        {connection.muted
          ? he
            ? COPY.unmute.he
            : COPY.unmute.en
          : he
            ? COPY.mute.he
            : COPY.mute.en}
      </button>
    </form>
    <span aria-hidden="true">·</span>
    <form action={manageConnectionAction}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="slug" value={connection.slug} />
      <input type="hidden" name="connectionId" value={connection.id} />
      <input type="hidden" name="manage" value="remove" />
      <button type="submit" className={quietAction}>
        {he ? COPY.remove.he : COPY.remove.en}
      </button>
    </form>
  </span>
);

const DiscoverLink = ({ he, filled }: { he: boolean; filled?: boolean }) => (
  <a
    href="#discovery"
    className={
      filled
        ? 'inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--n-purple)] px-5 text-sm font-medium text-white transition-colors hover:bg-[var(--n-purple-soft)]'
        : 'inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--n-purple)]/35 px-4 text-[13px] font-medium text-[var(--n-purple)] transition-colors hover:bg-[var(--n-purple)]/10'
    }
  >
    <DiscoverIcon />
    {he ? COPY.discover.he : COPY.discover.en}
  </a>
);

const ConnectionsSection = ({
  locale,
  he,
  num,
  connections,
  unread,
  channelsById,
  fellowById,
  directorySlug,
}: {
  locale: Locale;
  he: boolean;
  num: (value: number) => string;
  connections: Row[];
  unread: Map<string, number>;
  channelsById: Map<string, ConnectionChannels | null>;
  fellowById: Map<string, FellowParticipant>;
  directorySlug: string;
}) => {
  const total = connections.length;

  const tile = (connection: Row, index: number): ReactNode => {
    const channels = channelsById.get(connection.id);
    const count = unread.get(connection.id) ?? 0;
    const fellow = fellowById.get(connection.otherId);
    const line = fellow ? personLine(fellow) : connection.title;
    const open = fellow?.openToMeetings ?? false;
    return (
      <li
        key={connection.id}
        className="w-[10.5rem] flex-none snap-start md:w-[11rem]"
      >
        <article
          className="lounge-rise group relative flex h-full flex-col items-center px-1 text-center"
          style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
        >
          <span className="absolute end-0 top-0">
            <SafetyMenu
              locale={locale}
              he={he}
              participantId={connection.otherId}
              name={connection.otherName}
              slug={directorySlug}
            />
          </span>

          <span className="transition-transform duration-200 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100">
            <RingedAvatar
              name={connection.otherName}
              photoUrl={fellow?.photoUrl}
              tone={open ? 'green' : 'purple'}
              open={open}
              dim="size-16 md:size-[4.75rem]"
            />
          </span>

          <h3 className="n-name">
            {connection.otherName}
          </h3>
          {line ? (
            <p className="mt-0.5 w-full truncate text-[11px] leading-snug text-[var(--n-faint)]">
              {line}
              {connection.muted
                ? ` · ${he ? COPY.muted.he : COPY.muted.en}`
                : ''}
            </p>
          ) : connection.muted ? (
            <p className="mt-0.5 text-[11px] text-[var(--n-faint)]">
              {he ? COPY.muted.he : COPY.muted.en}
            </p>
          ) : null}

          <span className="mt-2.5 w-full">
            <MessageButton
              locale={locale}
              he={he}
              num={num}
              connection={connection}
              count={count}
            />
          </span>

          <ChannelRow
            locale={locale}
            he={he}
            connection={connection}
            channels={channels}
          />

          <QuietActions
            locale={locale}
            he={he}
            connection={connection}
            className="mt-auto pt-2"
          />
        </article>
      </li>
    );
  };

  /*
   * One connection deserves a spotlight, not a lonely bubble at the
   * start of an empty shelf: a slightly larger portrait, its own
   * availability line, and — since the space exists anyway — a quiet
   * invitation back up to discovery.
   */
  const spotlight = (connection: Row): ReactNode => {
    const channels = channelsById.get(connection.id);
    const count = unread.get(connection.id) ?? 0;
    const fellow = fellowById.get(connection.otherId);
    const line = fellow ? personLine(fellow) : connection.title;
    const open = fellow?.openToMeetings ?? false;
    return (
      <div className="mx-auto mt-6 flex max-w-xs flex-col items-center text-center">
        <article className="lounge-rise group relative flex w-full flex-col items-center">
          <span className="absolute end-2 top-0">
            <SafetyMenu
              locale={locale}
              he={he}
              participantId={connection.otherId}
              name={connection.otherName}
              slug={directorySlug}
            />
          </span>

          <span className="transition-transform duration-200 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100">
            <RingedAvatar
              name={connection.otherName}
              photoUrl={fellow?.photoUrl}
              tone={open ? 'green' : 'purple'}
              open={open}
              dim="size-[4.75rem] md:size-24"
            />
          </span>

          <h3 className="mt-3 w-full truncate font-display text-xl font-semibold leading-snug">
            {connection.otherName}
          </h3>
          {line ? (
            <p className="mt-0.5 w-full truncate text-[13px] leading-snug text-[var(--n-faint)]">
              {line}
              {connection.muted
                ? ` · ${he ? COPY.muted.he : COPY.muted.en}`
                : ''}
            </p>
          ) : connection.muted ? (
            <p className="mt-0.5 text-[13px] text-[var(--n-faint)]">
              {he ? COPY.muted.he : COPY.muted.en}
            </p>
          ) : null}
          {open ? (
            <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-[var(--n-green)]">
              <span aria-hidden="true" className="text-[8px]">
                ●
              </span>
              {he ? COPY.openLine.he : COPY.openLine.en}
            </p>
          ) : null}

          <span className="mt-3.5 flex w-full justify-center">
            <MessageButton
              locale={locale}
              he={he}
              num={num}
              connection={connection}
              count={count}
              wide
            />
          </span>

          <ChannelRow
            locale={locale}
            he={he}
            connection={connection}
            channels={channels}
          />

          <QuietActions
            locale={locale}
            he={he}
            connection={connection}
            className="mt-3"
          />
        </article>

        <p className="mt-7 text-xs text-[var(--n-soft)]">
          {he ? COPY.morePeople.he : COPY.morePeople.en}
        </p>
        <span className="mt-2">
          <DiscoverLink he={he} />
        </span>
      </div>
    );
  };

  /*
   * The shelf, by census: 2–4 people huddle centered — never spread
   * across the page's whole width; 5+ become a start-aligned rail the
   * thumb (and the mouse wheel) can walk. On a phone, four already
   * scroll.
   *
   * Four of them wrap once the huddle stops scrolling. Without that,
   * the row kept its single line at the width where the scrolling ends
   * and the extra simply hung off the page — a tablet could scroll the
   * whole document sideways, and nothing on screen explained why.
   */
  const groupList = (
    <ul
      className={
        total <= 3
          ? 'mt-5 flex flex-wrap justify-center gap-x-5 gap-y-6 md:gap-x-8'
          : '-mx-4 mt-5 flex snap-x gap-x-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:mx-0 md:flex-wrap md:justify-center md:gap-x-8 md:gap-y-6 md:overflow-visible md:px-0'
      }
    >
      {connections.map(tile)}
    </ul>
  );

  const rail = (
    <ul className="-mx-4 mt-5 flex snap-x gap-x-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:-mx-6 md:gap-x-4 md:px-6">
      {connections.map(tile)}
    </ul>
  );

  return (
    <section id="connections" className="scroll-mt-24">
      <div className="flex items-center gap-2.5">
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="size-6 text-[var(--n-purple)]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="9" cy="8" r="3.25" />
          <path d="M3.5 19c.6-3 2.8-4.5 5.5-4.5s4.9 1.5 5.5 4.5" />
          <circle cx="16.5" cy="9" r="2.5" />
          <path d="M15.6 14.6c2.3.2 4.1 1.6 4.7 4.2" />
        </svg>
        <h2
          className={`font-display text-2xl font-semibold md:text-[1.7rem] ${
            he ? '' : 'tracking-wide'
          }`}
        >
          {he ? COPY.title.he : COPY.title.en}
        </h2>
      </div>
      {total > 0 ? (
        <p className="mt-0.5 text-xs tabular-nums text-[var(--n-faint)]">
          {total === 1
            ? he
              ? COPY.one.he
              : COPY.one.en
            : `${num(total)} ${he ? COPY.many.he : COPY.many.en}`}
        </p>
      ) : null}

      {total === 0 ? (
        <div className="mx-auto mt-8 flex max-w-sm flex-col items-center gap-3 text-center">
          {/* Three quiet silhouettes and a plus — an invitation, not a void. */}
          <svg
            viewBox="0 0 120 76"
            aria-hidden="true"
            className="h-20 w-32 text-[var(--n-purple)]"
          >
            <g fill="currentColor" opacity="0.18">
              <circle cx="30" cy="26" r="11" />
              <path d="M12 66c1.6-13 9-19 18-19s16.4 6 18 19z" />
              <circle cx="90" cy="26" r="11" />
              <path d="M72 66c1.6-13 9-19 18-19s16.4 6 18 19z" />
            </g>
            <g fill="currentColor" opacity="0.28">
              <circle cx="60" cy="20" r="13" />
              <path d="M39 68c1.8-15 10.4-22 21-22s19.2 7 21 22z" />
            </g>
            <circle cx="60" cy="52" r="13" fill="var(--n-purple)" />
            <path
              d="M60 46v12M54 52h12"
              style={{ stroke: 'var(--nt-surface)' }}
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <path
              d="M84 8l1.8 4.2L90 14l-4.2 1.8L84 20l-1.8-4.2L78 14l4.2-1.8z"
              fill="currentColor"
              opacity="0.5"
            />
          </svg>
          <p className="font-display text-lg font-semibold">
            {he ? COPY.emptyTitle.he : COPY.emptyTitle.en}
          </p>
          <p className="text-sm text-[var(--n-soft)]">
            {he ? COPY.emptyBody.he : COPY.emptyBody.en}
          </p>
          <DiscoverLink he={he} filled />
        </div>
      ) : total === 1 ? (
        spotlight(connections[0]!)
      ) : total <= 4 ? (
        groupList
      ) : (
        rail
      )}
    </section>
  );
};

export default ConnectionsSection;
