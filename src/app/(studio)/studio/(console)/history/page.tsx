import Link from 'next/link';
import type { Locale } from '@/config/locales';
import { withBasePath } from '@/config/site';
import { AUDIT_ACTIONS, queryAudit } from '@/features/access';
import type { AuditEntry } from '@/features/access';
import { listEvents } from '@/features/events';
import {
  CONSOLE_UI,
  ConsoleDenied,
  ConsoleShell,
  auditLabel,
  getStudioLocale,
  requireCapability,
} from '@/features/studio';

/*
 * The audit log, whole. Every act anyone performed in the Studio —
 * who, what, on which conference, at what minute, with what detail —
 * newest first, filterable, paged, exportable. Read by the Netaim
 * Admin alone; written by the system and by nothing else; edited by
 * no one (the database refuses an UPDATE or DELETE on the table).
 */
const PAGE_SIZE = 100;

const t = (he: string, en: string): Record<Locale, string> => ({ he, en });
const UI = {
  sub: t(
    'כל פעולה שבוצעה בסטודיו: מי, מה, על איזה כנס, מתי, ומה בדיוק השתנה. היומן נכתב על ידי המערכת בלבד — אי אפשר לערוך או למחוק בו דבר.',
    'Every act performed in the Studio: who, what, on which conference, when, and what exactly changed. Written by the system alone — nothing in it can be edited or deleted.',
  ),
  conference: t('כנס', 'Conference'),
  actor: t('מי', 'Who'),
  action: t('פעולה', 'Action'),
  from: t('מתאריך', 'From'),
  to: t('עד תאריך', 'To'),
  filter: t('סינון', 'Filter'),
  clear: t('ניקוי', 'Clear'),
  exportCsv: t('ייצוא CSV', 'Export CSV'),
  exportJson: t('ייצוא JSON', 'Export JSON'),
  total: t('רשומות', 'entries'),
  page: t('עמוד', 'Page'),
  prev: t('הקודם', 'Previous'),
  next: t('הבא', 'Next'),
  when: t('מתי', 'When'),
  what: t('מה', 'What'),
  detail: t('פרטים', 'Detail'),
  all: t('הכול', 'All'),
  anyone: t('כולם', 'Anyone'),
};

const INPUT = 'rounded-md border border-[var(--c-line)] bg-[rgba(7,19,36,0.55)] px-2.5 py-1.5 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-bronze)]';
const BTN = 'inline-flex min-h-8 items-center rounded-md border border-[var(--c-line-strong)] px-3 text-xs text-[var(--c-text)] hover:border-[var(--c-bronze)] hover:text-[var(--c-bronze)]';

const when = (iso: string, locale: Locale): string => {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return '';
  return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-GB', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(parsed));
};

const detailText = (detail: AuditEntry['detail']): string => {
  if (!detail) return '';
  return Object.entries(detail)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`)
    .join(' · ');
};

interface HistoryPageProps {
  searchParams: Promise<{ event?: string; actor?: string; action?: string; from?: string; to?: string; page?: string }>;
}

const HistoryPage = async ({ searchParams }: HistoryPageProps) => {
  const params = await searchParams;
  const locale = await getStudioLocale();
  const access = await requireCapability('audit:read');
  if (!access) {
    return <ConsoleDenied locale={locale} title={CONSOLE_UI.historyTitle[locale]} />;
  }
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const query = {
    ...(params.event ? { subject: params.event } : {}),
    ...(params.actor ? { actorEmail: params.actor } : {}),
    ...(params.action ? { action: params.action } : {}),
    ...(params.from ? { from: new Date(params.from).toISOString() } : {}),
    ...(params.to ? { to: new Date(`${params.to}T23:59:59.999`).toISOString() } : {}),
  };
  const [result, events] = await Promise.all([
    queryAudit({ ...query, limit: PAGE_SIZE, page }),
    listEvents().catch(() => []),
  ]);
  const actors = new Map<string, string>();
  for (const entry of result.entries) {
    if (entry.actorEmail) actors.set(entry.actorEmail, entry.actorName || entry.actorEmail);
  }
  const qs = (overrides: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...params, ...overrides })) {
      if (value) next.set(key, value);
    }
    const s = next.toString();
    return s ? `?${s}` : '';
  };

  return (
    <ConsoleShell locale={locale} userName={access.creator.name} breadcrumb={CONSOLE_UI.historyTitle[locale]}>
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-6 py-6">
        <p className="max-w-3xl text-sm leading-relaxed text-[var(--c-text-soft)]">{UI.sub[locale]}</p>

        <form method="get" className="flex flex-wrap items-end gap-3 rounded-lg border border-[var(--c-line)] bg-[var(--c-panel)] p-4">
          <label className="block text-xs text-[var(--c-text-soft)]">
            {UI.conference[locale]}
            <select name="event" defaultValue={params.event ?? ''} className={`${INPUT} mt-1 block`}>
              <option value="">{UI.all[locale]}</option>
              {events.map((event) => (
                <option key={event.slug} value={event.slug}>{event.title}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-[var(--c-text-soft)]">
            {UI.actor[locale]}
            <input name="actor" list="audit-actors" defaultValue={params.actor ?? ''} placeholder={UI.anyone[locale]} className={`${INPUT} mt-1 block`} dir="ltr" />
            <datalist id="audit-actors">
              {[...actors.entries()].map(([email, name]) => (
                <option key={email} value={email}>{name}</option>
              ))}
            </datalist>
          </label>
          <label className="block text-xs text-[var(--c-text-soft)]">
            {UI.action[locale]}
            <select name="action" defaultValue={params.action ?? ''} className={`${INPUT} mt-1 block`}>
              <option value="">{UI.all[locale]}</option>
              {AUDIT_ACTIONS.map((action) => (
                <option key={action} value={action}>{auditLabel(action, locale)}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-[var(--c-text-soft)]">
            {UI.from[locale]}
            <input type="date" name="from" defaultValue={params.from ?? ''} className={`${INPUT} mt-1 block`} dir="ltr" />
          </label>
          <label className="block text-xs text-[var(--c-text-soft)]">
            {UI.to[locale]}
            <input type="date" name="to" defaultValue={params.to ?? ''} className={`${INPUT} mt-1 block`} dir="ltr" />
          </label>
          <button type="submit" className={BTN}>{UI.filter[locale]}</button>
          <Link href="/studio/history" className={BTN}>{UI.clear[locale]}</Link>
          <span className="ms-auto flex gap-2">
            <a href={withBasePath(`/studio/history/export${qs({ page: undefined, format: 'csv' })}`)} className={BTN}>{UI.exportCsv[locale]}</a>
            <a href={withBasePath(`/studio/history/export${qs({ page: undefined, format: 'json' })}`)} className={BTN}>{UI.exportJson[locale]}</a>
          </span>
        </form>

        <p className="text-xs text-[var(--c-text-faint)]">
          {result.total.toLocaleString(locale === 'he' ? 'he-IL' : 'en-GB')} {UI.total[locale]}
          {result.pages > 1 ? ` · ${UI.page[locale]} ${result.page}/${result.pages}` : ''}
        </p>

        {result.entries.length === 0 ? (
          <p className="rounded-xl border border-[var(--c-line)] px-5 py-8 text-center text-sm text-[var(--c-text-soft)]">
            {CONSOLE_UI.historyEmpty[locale]}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--c-line)]">
            <table className="w-full text-start text-sm">
              <thead className="bg-[var(--c-panel)] text-[11px] tracking-[0.08em] text-[var(--c-text-soft)]">
                <tr>
                  <th className="px-3 py-2 text-start font-medium">{UI.when[locale]}</th>
                  <th className="px-3 py-2 text-start font-medium">{UI.actor[locale]}</th>
                  <th className="px-3 py-2 text-start font-medium">{UI.what[locale]}</th>
                  <th className="px-3 py-2 text-start font-medium">{UI.conference[locale]}</th>
                  <th className="px-3 py-2 text-start font-medium">{UI.detail[locale]}</th>
                </tr>
              </thead>
              <tbody>
                {result.entries.map((entry) => (
                  <tr key={entry.id} className="border-t border-[var(--c-line)] align-top">
                    <td className="whitespace-nowrap px-3 py-2 text-xs tabular-nums text-[var(--c-text-soft)]" dir="ltr">{when(entry.at, locale)}</td>
                    <td className="px-3 py-2 text-xs">
                      <span className="block text-[var(--c-text)]">{entry.actorName || '—'}</span>
                      <span className="block text-[var(--c-text-faint)]" dir="ltr">{entry.actorEmail}</span>
                    </td>
                    <td className="px-3 py-2 text-[var(--c-text)]">
                      {auditLabel(entry.action, locale)}
                      <span className="block text-[10px] text-[var(--c-text-faint)]" dir="ltr">{entry.action}</span>
                    </td>
                    <td className="px-3 py-2 text-xs text-[var(--c-text-soft)]">{entry.subjectLabel || entry.subject || '—'}</td>
                    <td className="max-w-md px-3 py-2 text-xs text-[var(--c-text-soft)]" dir="auto">{detailText(entry.detail) || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {result.pages > 1 ? (
          <nav className="flex items-center gap-2 text-xs">
            {result.page > 1 ? <Link href={qs({ page: String(result.page - 1) })} className={BTN}>{UI.prev[locale]}</Link> : null}
            {result.page < result.pages ? <Link href={qs({ page: String(result.page + 1) })} className={BTN}>{UI.next[locale]}</Link> : null}
          </nav>
        ) : null}
      </div>
    </ConsoleShell>
  );
};

export const dynamic = 'force-dynamic';

export default HistoryPage;
