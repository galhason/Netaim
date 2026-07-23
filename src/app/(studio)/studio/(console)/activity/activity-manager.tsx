'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Locale } from '@/config/locales';
import type { SessionType, WorkshopStatus } from '@/features/program';
import { removeActivityAction } from './actions';

export interface ActivityRow {
  id: string;
  title: string;
  type: SessionType;
  startsAt: string | null;
  endsAt: string | null;
  room: string | null;
  speakers: { name: string; registered: boolean }[];
  featured: boolean;
  limit: number | null;
  confirmed: number;
  waiting: number;
  available: number | null;
  state: 'unlimited' | 'open' | 'limited' | 'full';
  status: WorkshopStatus;
}

interface Props {
  locale: Locale;
  slug: string | null;
  rows: ActivityRow[];
}

const TYPE_LABELS: Record<SessionType, Record<Locale, string>> = {
  talk: { he: 'הרצאה', en: 'Lecture' },
  workshop: { he: 'סדנה', en: 'Workshop' },
  keynote: { he: 'מליאה', en: 'Keynote' },
  tour: { he: 'סיור', en: 'Tour' },
  break: { he: 'הפסקה', en: 'Break' },
};

const STATUS_META: Record<
  WorkshopStatus,
  { he: string; en: string; cls: string; bar: string }
> = {
  available: {
    he: 'פנוי',
    en: 'Available',
    cls: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
    bar: 'bg-emerald-400',
  },
  almostFull: {
    he: 'כמעט מלא',
    en: 'Almost full',
    cls: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
    bar: 'bg-amber-400',
  },
  full: {
    he: 'מלא',
    en: 'Full',
    cls: 'border-rose-400/30 bg-rose-400/10 text-rose-300',
    bar: 'bg-rose-400',
  },
  waitlist: {
    he: 'רשימת המתנה',
    en: 'Waiting list',
    cls: 'border-violet-400/30 bg-violet-400/10 text-violet-300',
    bar: 'bg-violet-400',
  },
};

const T = (locale: Locale) => ({
  title: locale === 'he' ? 'פעילויות' : 'Activities',
  sub:
    locale === 'he'
      ? 'נהל את כל ההרצאות, הסדנאות, הסיורים והפעילויות בכנס שלך'
      : 'Manage every lecture, workshop, tour and activity in your conference',
  create: locale === 'he' ? 'פעילות חדשה' : 'New activity',
  search: locale === 'he' ? 'חיפוש פעילות…' : 'Search activities…',
  allStatuses: locale === 'he' ? 'כל הסטטוסים' : 'All statuses',
  allTypes: locale === 'he' ? 'כל הסוגים' : 'All types',
  colActivity: locale === 'he' ? 'פעילות' : 'Activity',
  colWhen: locale === 'he' ? 'תאריך ושעה' : 'Date & time',
  colWhere: locale === 'he' ? 'מיקום' : 'Location',
  colCap: locale === 'he' ? 'נרשמים/קיבולת' : 'Registered / capacity',
  colStatus: locale === 'he' ? 'סטטוס' : 'Status',
  colActions: locale === 'he' ? 'פעולות' : 'Actions',
  edit: locale === 'he' ? 'עריכה' : 'Edit',
  del: locale === 'he' ? 'מחיקה' : 'Delete',
  empty: locale === 'he' ? 'אין עדיין פעילויות.' : 'No activities yet.',
  statTotal: locale === 'he' ? 'סך הכל פעילויות' : 'Total activities',
  statRegistered: locale === 'he' ? 'סה״כ נרשמים' : 'Total registered',
  statFill: locale === 'he' ? 'תפוסה ממוצעת' : 'Average fill',
  statFull: locale === 'he' ? 'פעילויות מלאות' : 'Full activities',
  statWaiting: locale === 'he' ? 'ברשימת המתנה' : 'On waiting list',
});

const timeRange = (start: string | null, end: string | null, tag: string) => {
  if (!start) return '—';
  const s = new Date(start);
  const date = new Intl.DateTimeFormat(tag, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(s);
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat(tag, { hour: '2-digit', minute: '2-digit' }).format(d);
  const times = end ? `${fmt(s)} - ${fmt(new Date(end))}` : fmt(s);
  return { date, times };
};

const ActivityManager = ({ locale, slug, rows }: Props) => {
  const t = T(locale);
  const tag = locale === 'he' ? 'he-IL' : 'en-GB';
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | WorkshopStatus>('all');
  const [type, setType] = useState<'all' | SessionType>('all');

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (status === 'all' || r.status === status) &&
          (type === 'all' || r.type === type) &&
          (query.trim() === '' ||
            r.title.toLowerCase().includes(query.trim().toLowerCase())),
      ),
    [rows, query, status, type],
  );

  const stats = useMemo(() => {
    const registered = rows.reduce((s, r) => s + r.confirmed, 0);
    const limited = rows.filter((r) => r.limit && r.limit > 0);
    const fill =
      limited.length > 0
        ? Math.round(
            (limited.reduce((s, r) => s + r.confirmed / (r.limit as number), 0) /
              limited.length) *
              100,
          )
        : 0;
    return {
      total: rows.length,
      registered,
      fill,
      full: rows.filter((r) => r.state === 'full').length,
      waiting: rows.reduce((s, r) => s + r.waiting, 0),
    };
  }, [rows]);

  const cards = [
    { label: t.statTotal, value: String(stats.total) },
    { label: t.statRegistered, value: stats.registered.toLocaleString() },
    { label: t.statFill, value: `${stats.fill}%` },
    { label: t.statFull, value: String(stats.full) },
    { label: t.statWaiting, value: String(stats.waiting) },
  ];

  const types = Array.from(new Set(rows.map((r) => r.type)));

  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-6 overflow-y-auto px-6 py-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-medium text-[var(--c-text)]">
            {t.title}
          </h1>
          <p className="mt-1 text-sm text-[var(--c-text-soft)]">{t.sub}</p>
        </div>
        <Link
          href="/studio/activity/new"
          className="inline-flex flex-none items-center gap-2 rounded-lg bg-[var(--c-bronze)] px-4 py-2 text-sm font-medium text-[#161006]"
        >
          + {t.create}
        </Link>
      </header>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-[var(--c-line)] bg-[rgba(255,255,255,0.02)] p-4"
          >
            <p className="font-display text-2xl font-semibold text-[var(--c-text)]">
              {c.value}
            </p>
            <p className="mt-1 text-xs text-[var(--c-text-soft)]">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.search}
          className="min-w-0 flex-1 rounded-lg border border-[var(--c-line)] bg-[rgba(6,10,16,0.5)] px-3 py-2 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text-faint)]"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="rounded-lg border border-[var(--c-line)] bg-[rgba(6,10,16,0.5)] px-3 py-2 text-sm text-[var(--c-text)]"
        >
          <option value="all">{t.allStatuses}</option>
          {(Object.keys(STATUS_META) as WorkshopStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s][locale]}
            </option>
          ))}
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
          className="rounded-lg border border-[var(--c-line)] bg-[rgba(6,10,16,0.5)] px-3 py-2 text-sm text-[var(--c-text)]"
        >
          <option value="all">{t.allTypes}</option>
          {types.map((ty) => (
            <option key={ty} value={ty}>
              {TYPE_LABELS[ty][locale]}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[var(--c-line)]">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[rgba(255,255,255,0.03)] text-[var(--c-text-faint)]">
              <th className="p-3 text-start font-medium">{t.colActivity}</th>
              <th className="p-3 text-start font-medium">{t.colWhen}</th>
              <th className="p-3 text-start font-medium">{t.colWhere}</th>
              <th className="p-3 text-start font-medium">{t.colCap}</th>
              <th className="p-3 text-start font-medium">{t.colStatus}</th>
              <th className="p-3 text-end font-medium">{t.colActions}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="p-8 text-center text-[var(--c-text-soft)]"
                >
                  {t.empty}
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const when = timeRange(r.startsAt, r.endsAt, tag);
                const meta = STATUS_META[r.status];
                const pct =
                  r.limit && r.limit > 0
                    ? Math.min(100, Math.round((r.confirmed / r.limit) * 100))
                    : 0;
                return (
                  <tr
                    key={r.id}
                    className="border-t border-[var(--c-line)] align-middle"
                  >
                    <td className="p-3">
                      <p className="font-medium text-[var(--c-text)]">
                        {r.title}
                      </p>
                      <p className="text-xs text-[var(--c-text-faint)]">
                        {TYPE_LABELS[r.type][locale]}
                      </p>
                      {r.speakers.length > 0 ? (
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--c-text-soft)]">
                          {r.speakers.map((sp, i) => (
                            <span
                              key={`${sp.name}-${i}`}
                              className="inline-flex items-center gap-1"
                            >
                              <span aria-hidden="true">
                                {sp.registered ? '🟢' : '⚪'}
                              </span>
                              {sp.name}
                            </span>
                          ))}
                        </p>
                      ) : null}
                    </td>
                    <td className="p-3 text-[var(--c-text-soft)]">
                      {typeof when === 'string' ? (
                        when
                      ) : (
                        <>
                          <span className="tabular-nums">{when.date}</span>
                          <br />
                          <span className="text-xs tabular-nums text-[var(--c-text-faint)]">
                            {when.times}
                          </span>
                        </>
                      )}
                    </td>
                    <td className="p-3 text-[var(--c-text-soft)]">
                      {r.room ?? '—'}
                    </td>
                    <td className="p-3">
                      <p className="tabular-nums text-[var(--c-text)]">
                        {r.confirmed} / {r.limit ?? '∞'}
                      </p>
                      {r.limit ? (
                        <span className="mt-1 block h-1.5 w-28 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
                          <span
                            className={`block h-full rounded-full ${meta.bar}`}
                            style={{ width: `${pct}%` }}
                          />
                        </span>
                      ) : null}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs ${meta.cls}`}
                      >
                        {meta[locale]}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/studio/activity/${r.id}`}
                          className="rounded-md border border-[var(--c-line)] px-2.5 py-1 text-xs text-[var(--c-text-soft)] hover:text-[var(--c-text)]"
                        >
                          {t.edit}
                        </Link>
                        <form action={removeActivityAction}>
                          <input type="hidden" name="slug" value={slug ?? ''} />
                          <input type="hidden" name="sessionId" value={r.id} />
                          <button
                            type="submit"
                            className="rounded-md border border-rose-400/30 px-2.5 py-1 text-xs text-rose-300/90 hover:bg-rose-400/10"
                          >
                            {t.del}
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/*
 * Breadcrumb link back to the manager — shared by the wizard routes so
 * their header returns here rather than to the console root.
 */
export const BackToActivities = ({ locale }: { locale: Locale }) => (
  <Link
    href="/studio/activity"
    className="inline-flex items-center gap-1.5 font-medium text-[var(--c-text-soft)] transition-colors hover:text-[var(--c-text)]"
  >
    <span aria-hidden="true">{locale === 'he' ? '→' : '←'}</span>
    {locale === 'he' ? 'הפעילויות' : 'Activities'}
  </Link>
);

export default ActivityManager;
