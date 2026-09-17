import Link from 'next/link';
import type { Locale } from '@/config/locales';
import {
  countOpenReports,
  listReports,
  REPORT_STATUS_VALUES,
  type ReportRecord,
  type ReportStatus,
} from '@/features/networking';
import {
  CONSOLE_UI,
  ConsoleShell,
  REPORT_REASON_LABELS,
  REPORT_STATUS_LABELS,
  getStudioLocale,
  requireCapability,
} from '@/features/studio';
import { setReportStatusAction } from './actions';

/*
 * The team's side of blocking and reporting.
 *
 * A block protects one guest silently and needs nobody's attention. A
 * report is the opposite act: it asks the organisers to look. This
 * screen is where that looking happens, and it is deliberately plain —
 * who said what about whom, and one row of buttons that moves the
 * report through its states. Nothing here deletes, edits or answers on
 * the reporter's behalf; the only thing the platform can honestly
 * promise is that a person saw it and left their name on the record.
 *
 * The page carries its own capability gate rather than relying on the
 * Studio layout: the layout proves a grant exists, this content needs a
 * specific one, and it holds names, addresses and accounts of harm.
 */
const STATE_TONE: Record<ReportStatus, string> = {
  open: 'border-[var(--c-danger)]/50 bg-[var(--c-danger)]/10 text-[var(--c-danger-text)]',
  reviewing: 'border-[var(--c-bronze)]/50 bg-[var(--c-bronze)]/10 text-[var(--c-bronze)]',
  resolved: 'border-[var(--c-live)]/50 bg-[var(--c-live)]/10 text-[var(--c-live)]',
  dismissed: 'border-[var(--c-line-strong)] text-[var(--c-text-soft)]',
};

const STATE_ACTION: Record<ReportStatus, keyof typeof CONSOLE_UI> = {
  open: 'reportsMarkOpen',
  reviewing: 'reportsMarkReviewing',
  resolved: 'reportsMarkResolved',
  dismissed: 'reportsMarkDismissed',
};

const quietButton =
  'rounded-lg border border-[var(--c-line-strong)] px-3 py-1 text-[11px] text-[var(--c-text-soft)] transition-colors hover:border-[var(--c-bronze)]/50 hover:text-[var(--c-bronze)]';

const when = (iso: string | undefined, locale: Locale): string => {
  const parsed = iso ? Date.parse(iso) : Number.NaN;
  if (Number.isNaN(parsed)) {
    return '';
  }
  return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(parsed));
};

const label = (
  table: Record<string, Record<Locale, string>>,
  key: string,
  locale: Locale,
): string => table[key]?.[locale] ?? key;

const ReportCard = ({
  report,
  locale,
}: {
  report: ReportRecord;
  locale: Locale;
}) => (
  <li
    className={`rounded-xl border bg-[var(--c-panel)] px-5 py-4 ${
      report.status === 'open'
        ? 'border-[var(--c-danger)]/40'
        : 'border-[var(--c-line)]'
    }`}
  >
    <div className="flex flex-wrap items-center gap-3">
      <span
        className={`rounded-full border px-2.5 py-0.5 text-[10px] tracking-widest ${STATE_TONE[report.status]}`}
      >
        {label(REPORT_STATUS_LABELS, report.status, locale)}
      </span>
      <span className="font-medium">
        {label(REPORT_REASON_LABELS, report.reason, locale)}
      </span>
      {report.eventSlug ? (
        <Link
          href={`/studio/experiences/${report.eventSlug}`}
          className="text-xs text-[var(--c-text-soft)] underline-offset-4 hover:underline"
        >
          {report.eventSlug}
        </Link>
      ) : null}
      <span className="ms-auto text-xs tabular-nums text-[var(--c-text-faint)]">
        {when(report.createdAt, locale)}
      </span>
    </div>

    <dl className="mt-3 grid gap-x-6 gap-y-2 border-t border-[var(--c-line)] pt-3 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-[10px] tracking-[0.18em] text-[var(--c-text-faint)]">
          {CONSOLE_UI.reportsReported[locale].toUpperCase()}
        </dt>
        <dd className="mt-0.5">
          <span className="block">{report.reportedName || '—'}</span>
          <span className="block text-xs text-[var(--c-text-soft)]">
            {report.reportedEmail}
          </span>
          <Link
            href="/studio/participants"
            className="mt-1 inline-block text-[11px] text-[var(--c-bronze)] underline-offset-4 hover:underline"
          >
            {CONSOLE_UI.reportsOpenAccount[locale]}
          </Link>
        </dd>
      </div>
      <div>
        <dt className="text-[10px] tracking-[0.18em] text-[var(--c-text-faint)]">
          {CONSOLE_UI.reportsReporter[locale].toUpperCase()}
        </dt>
        <dd className="mt-0.5">
          <span className="block">{report.reporterName || '—'}</span>
          <span className="block text-xs text-[var(--c-text-soft)]">
            {report.reporterEmail}
          </span>
          {report.alsoBlocked ? (
            <span className="mt-1 inline-block text-[11px] text-[var(--c-text-faint)]">
              {CONSOLE_UI.reportsAlsoBlocked[locale]}
            </span>
          ) : null}
        </dd>
      </div>
    </dl>

    {report.details ? (
      <p className="mt-3 whitespace-pre-line rounded-lg bg-[rgba(7,19,36,0.5)] px-4 py-3 text-sm text-[var(--c-text)]">
        {report.details}
      </p>
    ) : null}

    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--c-line)] pt-3">
      {REPORT_STATUS_VALUES.filter((status) => status !== report.status).map(
        (status) => (
          <form key={status} action={setReportStatusAction}>
            <input type="hidden" name="id" value={report.id} />
            <input type="hidden" name="status" value={status} />
            <button type="submit" className={quietButton}>
              {CONSOLE_UI[STATE_ACTION[status]][locale]}
            </button>
          </form>
        ),
      )}
      {report.handledByName ? (
        <span className="ms-auto text-[11px] text-[var(--c-text-faint)]">
          {CONSOLE_UI.reportsHandledBy[locale]}: {report.handledByName}
          {report.handledAt ? ` · ${when(report.handledAt, locale)}` : ''}
        </span>
      ) : null}
    </div>
  </li>
);

const ReportsPage = async () => {
  const locale = await getStudioLocale();
  const access = await requireCapability('participants:manage');
  if (!access) {
    return (
      <ConsoleShell
        locale={locale}
        userName=""
        breadcrumb={
          <span className="font-medium text-[var(--c-text)]">
            {CONSOLE_UI.reportsTitle[locale]}
          </span>
        }
      >
        <div className="mx-auto max-w-2xl px-6 py-16">
          <p className="text-sm text-[var(--c-text-soft)]">
            {locale === 'he'
              ? 'לצפייה בדיווחי בטיחות דרושה הרשאת ניהול משתתפים.'
              : 'Viewing safety reports requires the participants management permission.'}
          </p>
        </div>
      </ConsoleShell>
    );
  }

  const [reports, open] = await Promise.all([
    listReports().catch(() => []),
    countOpenReports(),
  ]);

  return (
    <ConsoleShell
      locale={locale}
      userName={access.creator.name}
      openReports={open}
      breadcrumb={
        <span className="font-medium text-[var(--c-text)]">
          {CONSOLE_UI.reportsTitle[locale]}
        </span>
      }
    >
      <div className="mx-auto flex h-full max-w-4xl flex-col gap-6 overflow-y-auto px-6 py-8">
        <header>
          <h1 className="font-display text-3xl font-medium">
            {CONSOLE_UI.reportsTitle[locale]}
          </h1>
          <p className="mt-1 text-sm text-[var(--c-text-soft)]">
            {CONSOLE_UI.reportsSub[locale]}
          </p>
          {open > 0 ? (
            <p className="mt-3 inline-block rounded-full border border-[var(--c-danger)]/50 bg-[var(--c-danger)]/10 px-3 py-1 text-xs text-[var(--c-danger-text)]">
              {open} {CONSOLE_UI.reportsOpenCount[locale]}
            </p>
          ) : null}
        </header>

        {reports.length === 0 ? (
          <p className="text-sm text-[var(--c-text-soft)]">
            {CONSOLE_UI.reportsEmpty[locale]}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {reports.map((report) => (
              <ReportCard key={report.id} report={report} locale={locale} />
            ))}
          </ul>
        )}
      </div>
    </ConsoleShell>
  );
};

/*
 * The response depends on who is asking, so it is rendered per request
 * and never prerendered or shared. Declared rather than left to Next to
 * infer from a cookie read: an inferred guard disappears the moment a
 * refactor moves that read behind a helper, and the failure would be a
 * privacy leak that nothing announces.
 */
export const dynamic = 'force-dynamic';

export default ReportsPage;
