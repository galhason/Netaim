'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Locale } from '@/config/locales';
import { withBasePath } from '@/config/site';
import type { SessionType, WorkshopStatus } from '@/features/program';
import { archiveActivityAction, removeActivityAction, restoreActivityAction } from './actions';
import RegistrantsDialog from './registrants-dialog';

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
  /* The vote on the language, where the activity holds one: the tally, and the decision once taken. */
  votes?: { label: string; confirmed: number; waiting: number }[];
  decidedLanguage?: string;
}

export interface ActivityPermissions {
  manage: boolean;
  archive: boolean;
  delete: boolean;
  /* Seeing who signed up — names, phones, emails — on screen and as Excel. */
  roster: boolean;
  /* Giving a guest's place back from the desk. */
  release: boolean;
}

interface Props {
  locale: Locale;
  slug: string | null;
  rows: ActivityRow[];
  /* The shelf: archived activities, shown apart and restorable. */
  archived?: ActivityRow[];
  can: ActivityPermissions;
}

const TYPE_LABELS: Record<SessionType, Record<Locale, string>> = {
  talk: { he: 'הרצאה', en: 'Lecture' },
  workshop: { he: 'סדנה', en: 'Seminar' },
  keynote: { he: 'מליאה', en: 'Keynote' },
  tour: { he: 'סיור', en: 'Tour' },
  break: { he: 'הפסקה', en: 'Break' },
  gathering: { he: 'פאנל', en: 'Panel' },
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
  view: locale === 'he' ? 'צפייה' : 'View',
  del: locale === 'he' ? 'מחיקה' : 'Delete',
  archive: locale === 'he' ? 'לארכיון' : 'Archive',
  restore: locale === 'he' ? 'שחזור' : 'Restore',
  archiveTitle: locale === 'he' ? 'ארכיון פעילויות' : 'Activity archive',
  archiveSub:
    locale === 'he'
      ? 'פעילות בארכיון אינה מפורסמת ואינה בתוכנית. אפשר לשחזר אותה בכל רגע.'
      : 'An archived activity is unpublished and off the program. It can be restored at any time.',
  archiveEmpty: locale === 'he' ? 'הארכיון ריק.' : 'The archive is empty.',
  empty: locale === 'he' ? 'אין עדיין פעילויות.' : 'No activities yet.',
  allDays: locale === 'he' ? 'כל הימים' : 'All days',
  undated: locale === 'he' ? 'ללא תאריך' : 'No date',
  dayCount: (n: number) =>
    n === 1 ? (locale === 'he' ? 'פעילות אחת' : '1 activity') : locale === 'he' ? `${n} פעילויות` : `${n} activities`,
  statTotal: locale === 'he' ? 'סך הכל פעילויות' : 'Total activities',
  statRegistered: locale === 'he' ? 'סה״כ נרשמים' : 'Total registered',
  statFill: locale === 'he' ? 'תפוסה ממוצעת' : 'Average fill',
  statFull: locale === 'he' ? 'פעילויות מלאות' : 'Full activities',
  statWaiting: locale === 'he' ? 'ברשימת המתנה' : 'On waiting list',
  votes: locale === 'he' ? 'הצבעת שפה:' : 'Language vote:',
  voteDecided: locale === 'he' ? 'שפה נקבעה:' : 'Language decided:',
  votesNone: locale === 'he' ? 'הצבעת שפה: אין נרשמים עדיין' : 'Language vote: no registrants yet',
  exportAll: locale === 'he' ? 'ייצוא כל הנרשמים' : 'Export all registrants',
  exportAllHint:
    locale === 'he'
      ? 'דוח אחד באקסל: הנרשמים לכל סדנה, הרצאה וסיור עם סיכום לכל אחת, וסיכום כללי בסוף'
      : 'One Excel report: the registrants of every seminar, lecture and tour with a summary under each, and an overall summary at the end',
  exportOne: locale === 'he' ? 'אקסל' : 'Excel',
  exportOneLabel: (title: string) =>
    locale === 'he' ? `ייצוא הנרשמים לאקסל: ${title}` : `Export registrants to Excel: ${title}`,
  registrants: locale === 'he' ? 'נרשמים' : 'Registrants',
  registrantsLabel: (title: string, n: number) =>
    locale === 'he' ? `הנרשמים ל${title} (${n})` : `Registrants of ${title} (${n})`,
});

/* People, as a small line drawing: the button that opens the list. */
const People = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true" className="size-3.5 flex-none" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7.5" cy="6.5" r="3" />
    <path d="M1.5 16.5a6 6 0 0 1 12 0M13 3.8a3 3 0 0 1 0 5.4M15 11.2a6 6 0 0 1 3.5 5.3" />
  </svg>
);

/* A file to download, not a page — so a plain link, never a client navigation. */
const Download = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true" className="size-3.5 flex-none" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 3v10M5.5 8.5 10 13l4.5-4.5M4 16.5h12" />
  </svg>
);

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

const ActivityManager = ({ locale, slug, rows, archived = [], can }: Props) => {
  const t = T(locale);
  const tag = locale === 'he' ? 'he-IL' : 'en-GB';
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | WorkshopStatus>('all');
  const [type, setType] = useState<'all' | SessionType>('all');
  const [day, setDay] = useState<string>('all');
  /* The activity whose registrants are open in the window, if any. */
  const [open, setOpen] = useState<ActivityRow | null>(null);

  /*
   * The day an activity belongs to, as the list names it: a calendar
   * day in the operator's own clock, the same one the row prints — so
   * the heading and the dates under it never disagree. An activity
   * without a start has no day, and gathers with the others of its kind
   * at the end, under "no date".
   */
  const dayOf = (startsAt: string | null): string => {
    if (!startsAt || Number.isNaN(Date.parse(startsAt))) return '';
    return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(startsAt));
  };
  const dayName = (key: string): string =>
    key === ''
      ? t.undated
      : new Intl.DateTimeFormat(tag, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(
          new Date(`${key}T12:00:00`),
        );

  const filtered = useMemo(
    () =>
      rows
        .filter(
          (r) =>
            (status === 'all' || r.status === status) &&
            (type === 'all' || r.type === type) &&
            (day === 'all' || dayOf(r.startsAt) === day) &&
            (query.trim() === '' ||
              r.title.toLowerCase().includes(query.trim().toLowerCase())),
        )
        .sort((a, b) => {
          /* Dated before undated; then by the clock; then by name. */
          const da = dayOf(a.startsAt);
          const db = dayOf(b.startsAt);
          if (da !== db) return da === '' ? 1 : db === '' ? -1 : da.localeCompare(db);
          return (Date.parse(a.startsAt ?? '') || 0) - (Date.parse(b.startsAt ?? '') || 0) || a.title.localeCompare(b.title, tag);
        }),
    [rows, query, status, type, day, tag],
  );

  /* The list as days: one group per calendar day, in order, "no date" last. */
  const groups = useMemo(() => {
    const out: { key: string; rows: ActivityRow[] }[] = [];
    for (const row of filtered) {
      const key = dayOf(row.startsAt);
      const last = out[out.length - 1];
      if (last && last.key === key) last.rows.push(row);
      else out.push({ key, rows: [row] });
    }
    return out;
  }, [filtered]);

  /* Every day the programme has, for the day filter — dated days in order, then "no date" if any. */
  const days = useMemo(() => {
    const keys = Array.from(new Set(rows.map((r) => dayOf(r.startsAt))));
    return keys.sort((a, b) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b)));
  }, [rows]);

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
        <div className="flex flex-none items-center gap-2">
          {can.roster && rows.length > 0 ? (
            <a
              href={withBasePath('/studio/activity/roster')}
              title={t.exportAllHint}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--c-line-strong)] px-4 py-2 text-sm text-[var(--c-text-soft)] transition-colors hover:border-[var(--c-bronze)]/50 hover:text-[var(--c-bronze)]"
            >
              <Download />
              {t.exportAll}
            </a>
          ) : null}
          {/*
            * Beside "new", not buried in a menu: a programme is usually
            * imported once, at the start, by somebody who has never seen
            * this screen before.
            */}
          {can.manage ? (<>
          <Link
            href="/studio/activity/import"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--c-line-strong)] px-4 py-2 text-sm text-[var(--c-text-soft)] transition-colors hover:border-[var(--c-bronze)]/50 hover:text-[var(--c-bronze)]"
          >
            {locale === 'he' ? 'ייבוא מאקסל' : 'Import'}
          </Link>
          <Link
            href="/studio/activity/new"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--c-bronze)] px-4 py-2 text-sm font-medium text-[var(--c-on-accent)]"
          >
            + {t.create}
          </Link>
          </>) : null}
        </div>
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
          className="min-w-0 flex-1 rounded-lg border border-[var(--c-line)] bg-[rgba(7,19,36,0.5)] px-3 py-2 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text-faint)]"
        />
        {days.length > 1 ? (
          <select
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="rounded-lg border border-[var(--c-line)] bg-[rgba(7,19,36,0.5)] px-3 py-2 text-sm text-[var(--c-text)]"
          >
            <option value="all">{t.allDays}</option>
            {days.map((key) => (
              <option key={key || 'undated'} value={key}>
                {dayName(key)}
              </option>
            ))}
          </select>
        ) : null}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="rounded-lg border border-[var(--c-line)] bg-[rgba(7,19,36,0.5)] px-3 py-2 text-sm text-[var(--c-text)]"
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
          className="rounded-lg border border-[var(--c-line)] bg-[rgba(7,19,36,0.5)] px-3 py-2 text-sm text-[var(--c-text)]"
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
              groups.flatMap((group) => [
                <tr key={`day-${group.key || 'undated'}`} className="bg-[rgba(255,255,255,0.04)]">
                  <th
                    colSpan={6}
                    scope="rowgroup"
                    className="border-t border-[var(--c-line)] px-3 py-2 text-start text-xs font-semibold uppercase tracking-wide text-[var(--c-bronze)]"
                  >
                    {dayName(group.key)}
                    <span className="ms-2 font-normal normal-case tracking-normal text-[var(--c-text-faint)]">
                      · {t.dayCount(group.rows.length)}
                    </span>
                  </th>
                </tr>,
                ...group.rows.map((r) => {
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
                      {r.votes ? (
                        <p className="mt-1.5 text-xs text-[var(--c-text-soft)]">
                          {r.decidedLanguage ? (
                            <span className="text-[var(--c-bronze)]">{t.voteDecided} {r.decidedLanguage}</span>
                          ) : r.votes.length > 0 ? (
                            <>
                              <span className="text-[var(--c-text-faint)]">{t.votes} </span>
                              {r.votes.map((v, i) => (
                                <span key={v.label} className="tabular-nums">
                                  {i > 0 ? ' · ' : ''}
                                  {v.label} {v.confirmed}
                                  {v.waiting > 0 ? ` (+${v.waiting})` : ''}
                                </span>
                              ))}
                            </>
                          ) : (
                            <span className="text-[var(--c-text-faint)]">{t.votesNone}</span>
                          )}
                        </p>
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
                          {can.manage ? t.edit : t.view}
                        </Link>
                        {can.roster ? (
                          <button
                            type="button"
                            onClick={() => setOpen(r)}
                            aria-label={t.registrantsLabel(r.title, r.confirmed + r.waiting)}
                            aria-haspopup="dialog"
                            className="inline-flex items-center gap-1 rounded-md border border-[var(--c-line)] px-2.5 py-1 text-xs text-[var(--c-text-soft)] hover:border-[var(--c-bronze)]/50 hover:text-[var(--c-bronze)]"
                          >
                            <People />
                            {t.registrants}
                            <span className="rounded-full bg-[rgba(255,255,255,0.08)] px-1.5 text-[10px] tabular-nums text-[var(--c-text)]">
                              {r.confirmed + r.waiting}
                            </span>
                          </button>
                        ) : null}
                        {can.roster ? (
                          <a
                            href={withBasePath(`/studio/activity/roster?session=${encodeURIComponent(r.id)}`)}
                            aria-label={t.exportOneLabel(r.title)}
                            title={t.exportOneLabel(r.title)}
                            className="inline-flex items-center gap-1 rounded-md border border-[var(--c-line)] px-2.5 py-1 text-xs text-[var(--c-text-soft)] hover:border-[var(--c-bronze)]/50 hover:text-[var(--c-bronze)]"
                          >
                            <Download />
                            {t.exportOne}
                          </a>
                        ) : null}
                        {can.archive ? (
                          <form action={archiveActivityAction}>
                            <input type="hidden" name="slug" value={slug ?? ''} />
                            <input type="hidden" name="sessionId" value={r.id} />
                            <button
                              type="submit"
                              className="rounded-md border border-amber-400/30 px-2.5 py-1 text-xs text-amber-300/90 hover:bg-amber-400/10"
                            >
                              {t.archive}
                            </button>
                          </form>
                        ) : null}
                        {can.delete ? (
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
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              }),
              ])
            )}
          </tbody>
        </table>
      </div>

      {can.archive || archived.length > 0 ? (
        <details className="mt-8 rounded-xl border border-[var(--c-line)] bg-[var(--c-panel)]">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-[var(--c-text)]">
            {t.archiveTitle} ({archived.length})
            <span className="ms-2 text-xs font-normal text-[var(--c-text-faint)]">{t.archiveSub}</span>
          </summary>
          {archived.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-[var(--c-text-soft)]">{t.archiveEmpty}</p>
          ) : (
            <ul className="border-t border-[var(--c-line)]">
              {archived.map((r) => {
                const when = timeRange(r.startsAt, r.endsAt, tag);
                return (
                  <li key={r.id} className="flex flex-wrap items-center gap-3 border-b border-[var(--c-line)] px-4 py-3 text-sm last:border-b-0">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[var(--c-text)]">{r.title}</span>
                      <span className="block text-xs text-[var(--c-text-faint)]">
                        {TYPE_LABELS[r.type][locale]}
                        {typeof when === 'string' ? '' : ` · ${when.date} ${when.times}`}
                      </span>
                    </span>
                    <Link href={`/studio/activity/${r.id}`} className="rounded-md border border-[var(--c-line)] px-2.5 py-1 text-xs text-[var(--c-text-soft)] hover:text-[var(--c-text)]">
                      {t.view}
                    </Link>
                    {can.archive ? (
                      <form action={restoreActivityAction}>
                        <input type="hidden" name="slug" value={slug ?? ''} />
                        <input type="hidden" name="sessionId" value={r.id} />
                        <button type="submit" className="rounded-md border border-emerald-400/30 px-2.5 py-1 text-xs text-emerald-300/90 hover:bg-emerald-400/10">
                          {t.restore}
                        </button>
                      </form>
                    ) : null}
                    {can.delete ? (
                      <form action={removeActivityAction}>
                        <input type="hidden" name="slug" value={slug ?? ''} />
                        <input type="hidden" name="sessionId" value={r.id} />
                        <button type="submit" className="rounded-md border border-rose-400/30 px-2.5 py-1 text-xs text-rose-300/90 hover:bg-rose-400/10">
                          {t.del}
                        </button>
                      </form>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </details>
      ) : null}

      {open && slug ? (
        <RegistrantsDialog
          key={open.id}
          locale={locale}
          slug={slug}
          sessionId={open.id}
          title={open.title}
          canRelease={can.release}
          onClose={() => setOpen(null)}
        />
      ) : null}
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
