import Link from 'next/link';
import { eventHistory, platformHistory } from '@/features/access';
import type { AuditEntry } from '@/features/access';
import { listEvents } from '@/features/events';
import {
  CONSOLE_UI,
  ConsoleShell,
  auditLabel,
  getStudioCreator,
  getStudioLocale,
} from '@/features/studio';
import type { Locale } from '@/config/locales';

/*
 * The accountability trail: who did what, and when. Read-only by
 * construction — there is no control on this page, because a history
 * with an edit button proves nothing.
 */
interface HistoryPageProps {
  searchParams: Promise<{ event?: string }>;
}

const when = (iso: string, locale: Locale): string => {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) {
    return '';
  }
  return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(parsed));
};

const Row = ({ entry, locale }: { entry: AuditEntry; locale: Locale }) => {
  const label = auditLabel(entry.action, locale);
  return (
    <li className="flex flex-col gap-1 border-b border-white/8 py-3.5 last:border-0 sm:flex-row sm:items-baseline sm:gap-4">
      <time className="w-40 flex-none text-xs tabular-nums text-white/40">
        {when(entry.at, locale)}
      </time>
      <span className="flex-1">
        <span className="text-sm text-white/90">{label}</span>
        {entry.subject ? (
          <span className="text-sm text-white/45">
            {' · '}
            {entry.subjectLabel || entry.subject}
          </span>
        ) : null}
      </span>
      <span className="w-56 flex-none text-xs text-white/50">
        {entry.actorName || entry.actorEmail}
      </span>
    </li>
  );
};

const HistoryPage = async ({ searchParams }: HistoryPageProps) => {
  const { event: eventSlug } = await searchParams;
  const locale = await getStudioLocale();
  const creator = await getStudioCreator();

  const [entries, events] = await Promise.all([
    eventSlug ? eventHistory(eventSlug) : platformHistory(),
    listEvents().catch(() => []),
  ]);

  return (
    <ConsoleShell
      locale={locale}
      userName={creator?.name ?? ''}
      breadcrumb={CONSOLE_UI.historyTitle[locale]}
    >
      <header className="mb-8">
        <p className="max-w-2xl text-sm leading-relaxed text-white/55">
          {CONSOLE_UI.historySub[locale]}
        </p>
      </header>

      <nav className="mb-7 flex flex-wrap gap-2">
        <Link
          href="/studio/history"
          aria-current={eventSlug ? undefined : 'page'}
          className={`rounded-full px-4 py-1.5 text-xs transition-colors ${
            eventSlug
              ? 'text-white/50 hover:text-white/80'
              : 'bg-white/10 text-white'
          }`}
        >
          {CONSOLE_UI.historyAll[locale]}
        </Link>
        {events.map((event) => (
          <Link
            key={event.slug}
            href={`/studio/history?event=${encodeURIComponent(event.slug)}`}
            aria-current={eventSlug === event.slug ? 'page' : undefined}
            className={`rounded-full px-4 py-1.5 text-xs transition-colors ${
              eventSlug === event.slug
                ? 'bg-white/10 text-white'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            {event.title}
          </Link>
        ))}
      </nav>

      {entries.length === 0 ? (
        <p className="rounded-xl border border-white/10 px-5 py-8 text-center text-sm text-white/45">
          {CONSOLE_UI.historyEmpty[locale]}
        </p>
      ) : (
        <ul className="rounded-xl border border-white/10 px-5">
          {entries.map((entry) => (
            <Row key={entry.id} entry={entry} locale={locale} />
          ))}
        </ul>
      )}
    </ConsoleShell>
  );
};

export const dynamic = 'force-dynamic';

export default HistoryPage;
