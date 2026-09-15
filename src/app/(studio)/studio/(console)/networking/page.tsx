import Link from 'next/link';
import type { Locale } from '@/config/locales';
import { countOpenReports } from '@/features/networking';
import {
  CONSOLE_UI,
  ConsoleShell,
  getStudioLocale,
  getStudioNetworking,
  requireCapability,
  type StudioNetworkingView,
} from '@/features/studio';

/*
 * The production's window into the community page.
 *
 * The Networking page belongs to the guests; this screen is how the
 * team keeps an eye on it without stepping inside: the honest counts
 * (who is listed, who opened their door, who connected, what stands in
 * the calendar), the latest connections by name, and the meetings as
 * an agenda. Chat is a number here, never a transcript — the operators
 * see that people talk, not what they say. Mute never appears at all;
 * it is private to the person who muted.
 *
 * The doors out of this screen are the levers the team actually has:
 * the announcement composer (which feeds the guests' notification
 * bell), the safety reports queue, and the public page itself.
 */
const STAT_TILE =
  'rounded-xl border border-[var(--c-line)] bg-[var(--c-panel)] px-4 py-3';

const PANEL =
  'rounded-xl border border-[var(--c-line)] bg-[var(--c-panel)] p-5';

const CHIP: Record<string, string> = {
  accepted: 'border-[var(--c-live)]/50 bg-[var(--c-live)]/10 text-[var(--c-live)]',
  confirmed: 'border-[var(--c-live)]/50 bg-[var(--c-live)]/10 text-[var(--c-live)]',
  pending: 'border-[var(--c-bronze)]/50 bg-[var(--c-bronze)]/10 text-[var(--c-bronze)]',
  proposed: 'border-[var(--c-bronze)]/50 bg-[var(--c-bronze)]/10 text-[var(--c-bronze)]',
  declined: 'border-[var(--c-line-strong)] text-[var(--c-text-soft)]',
  cancelled: 'border-[var(--c-line-strong)] text-[var(--c-text-soft)]',
};

const quietLink =
  'rounded-lg border border-[var(--c-line-strong)] px-3 py-1.5 text-xs text-[var(--c-text-soft)] transition-colors hover:border-[var(--c-bronze)]/50 hover:text-[var(--c-bronze)]';

const when = (iso: string | undefined, locale: Locale): string => {
  const parsed = iso ? Date.parse(iso) : Number.NaN;
  if (Number.isNaN(parsed)) {
    return '';
  }
  return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-GB', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Jerusalem',
  }).format(new Date(parsed));
};

const connectionLabel = (status: string, locale: Locale): string =>
  status === 'accepted'
    ? CONSOLE_UI.networkingConnAccepted[locale]
    : status === 'pending'
      ? CONSOLE_UI.networkingConnPending[locale]
      : status === 'declined'
        ? CONSOLE_UI.networkingConnDeclined[locale]
        : CONSOLE_UI.networkingConnRemoved[locale];

const meetingLabel = (status: string, locale: Locale): string =>
  status === 'confirmed'
    ? CONSOLE_UI.networkingMeetConfirmed[locale]
    : status === 'cancelled'
      ? CONSOLE_UI.networkingMeetCancelled[locale]
      : CONSOLE_UI.networkingMeetProposed[locale];

const Stat = ({ value, label }: { value: number; label: string }) => (
  <div className={STAT_TILE}>
    <p className="font-display text-2xl font-medium tabular-nums">
      {value.toLocaleString()}
    </p>
    <p className="mt-0.5 text-[11px] text-[var(--c-text-soft)]">{label}</p>
  </div>
);

const Board = ({
  view,
  locale,
}: {
  view: StudioNetworkingView;
  locale: Locale;
}) => (
  <>
    <div className="flex flex-wrap gap-2">
      <Link
        href={`/${locale}/me/networking`}
        target="_blank"
        className={quietLink}
      >
        {CONSOLE_UI.networkingViewPage[locale]} ↗
      </Link>
      <Link href="/studio/communications" className={quietLink}>
        {CONSOLE_UI.networkingCompose[locale]}
      </Link>
      <Link href="/studio/reports" className={quietLink}>
        {CONSOLE_UI.networkingOpenReports[locale]}
      </Link>
    </div>

    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      <Stat value={view.listed} label={CONSOLE_UI.networkingStatListed[locale]} />
      <Stat
        value={view.openToMeetings}
        label={CONSOLE_UI.networkingStatOpen[locale]}
      />
      <Stat
        value={view.activeConnections}
        label={CONSOLE_UI.networkingStatConnections[locale]}
      />
      <Stat
        value={view.pendingRequests}
        label={CONSOLE_UI.networkingStatPending[locale]}
      />
      <Stat
        value={view.plannedMeetings}
        label={CONSOLE_UI.networkingStatMeetings[locale]}
      />
      <Stat
        value={view.messages}
        label={CONSOLE_UI.networkingStatMessages[locale]}
      />
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <section className={PANEL}>
        <h2 className="text-sm font-medium">
          {CONSOLE_UI.networkingRecent[locale]}
        </h2>
        {view.recentConnections.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--c-text-soft)]">
            {CONSOLE_UI.networkingRecentEmpty[locale]}
          </p>
        ) : (
          <ul className="mt-3 flex flex-col">
            {view.recentConnections.map((row, index) => (
              <li
                key={row.id}
                className={`flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm ${
                  index > 0 ? 'border-t border-[var(--c-line)]' : ''
                }`}
              >
                <span className="min-w-0">
                  {row.requesterName || '—'}
                  <span
                    aria-hidden="true"
                    className="mx-1.5 text-[var(--c-text-faint)]"
                  >
                    ↔
                  </span>
                  {row.addresseeName || '—'}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] tracking-wide ${
                    CHIP[row.status] ?? CHIP.declined
                  }`}
                >
                  {connectionLabel(row.status, locale)}
                </span>
                <span className="ms-auto text-xs tabular-nums text-[var(--c-text-faint)]">
                  {when(row.createdAt, locale)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={PANEL}>
        <h2 className="text-sm font-medium">
          {CONSOLE_UI.networkingMeetings[locale]}
        </h2>
        {view.meetings.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--c-text-soft)]">
            {CONSOLE_UI.networkingMeetingsEmpty[locale]}
          </p>
        ) : (
          <ul className="mt-3 flex flex-col">
            {view.meetings.map((meeting, index) => (
              <li
                key={meeting.id}
                className={`flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm ${
                  index > 0 ? 'border-t border-[var(--c-line)]' : ''
                } ${meeting.status === 'cancelled' ? 'opacity-60' : ''}`}
              >
                <span className="min-w-0">
                  {meeting.hostName || '—'}
                  <span
                    aria-hidden="true"
                    className="mx-1.5 text-[var(--c-text-faint)]"
                  >
                    ↔
                  </span>
                  {meeting.guestName || '—'}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] tracking-wide ${
                    CHIP[meeting.status] ?? CHIP.cancelled
                  }`}
                >
                  {meetingLabel(meeting.status, locale)}
                </span>
                <span className="ms-auto text-xs tabular-nums text-[var(--c-text-faint)]">
                  {when(meeting.startsAt, locale)}
                  {meeting.location ? ` · ${meeting.location}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  </>
);

const NetworkingConsolePage = async () => {
  const locale = await getStudioLocale();
  const access = await requireCapability('participants:manage');
  if (!access) {
    return (
      <ConsoleShell
        locale={locale}
        userName=""
        breadcrumb={
          <span className="font-medium text-[var(--c-text)]">
            {CONSOLE_UI.networkingTitle[locale]}
          </span>
        }
      >
        <div className="mx-auto max-w-2xl px-6 py-16">
          <p className="text-sm text-[var(--c-text-soft)]">
            {locale === 'he'
              ? 'לצפייה במסך הנטוורקינג דרושה הרשאת ניהול משתתפים.'
              : 'Viewing the networking screen requires the participants management permission.'}
          </p>
        </div>
      </ConsoleShell>
    );
  }

  const [view, open] = await Promise.all([
    getStudioNetworking(locale),
    countOpenReports(),
  ]);

  return (
    <ConsoleShell
      locale={locale}
      userName={access.creator.name}
      openReports={open}
      breadcrumb={
        <span className="font-medium text-[var(--c-text)]">
          {CONSOLE_UI.networkingTitle[locale]}
        </span>
      }
    >
      <div className="mx-auto flex h-full max-w-5xl flex-col gap-6 overflow-y-auto px-6 py-8">
        <header>
          <h1 className="font-display text-3xl font-medium">
            {CONSOLE_UI.networkingTitle[locale]}
          </h1>
          <p className="mt-1 text-sm text-[var(--c-text-soft)]">
            {CONSOLE_UI.networkingSub[locale]}
          </p>
        </header>

        {view ? (
          <Board view={view} locale={locale} />
        ) : (
          <p className="text-sm text-[var(--c-text-soft)]">
            {CONSOLE_UI.networkingNoConference[locale]}
          </p>
        )}
      </div>
    </ConsoleShell>
  );
};

/*
 * The response depends on who is asking, so it is rendered per request
 * and never prerendered or shared.
 */
export const dynamic = 'force-dynamic';

export default NetworkingConsolePage;
