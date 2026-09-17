'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Locale } from '@/config/locales';

/*
 * Import, in three plain steps: take the file we hand you, fill it in,
 * and see exactly what will happen before anything happens.
 *
 * The preview is the point. A bulk import that reports "14 created, 3
 * failed" after the fact leaves an organiser hunting through their own
 * conference for what went wrong; this shows every row with its verdict
 * first, names the line number in their own spreadsheet, and creates
 * nothing until they press the second button.
 *
 * The file stays in the browser between the two steps and is sent again
 * to commit, so the server reads it twice and never trusts a parsed row
 * that came back from here.
 */
interface PreviewRow {
  line: number;
  title: string;
  type: string;
  date: string;
  from: string;
  to: string;
  place: string;
  capacity: string;
  problems: string[];
}

interface Preview {
  ok: true;
  missingColumns: string[];
  readyCount: number;
  rows: PreviewRow[];
}

interface Props {
  locale: Locale;
  columnLabels: Record<string, string>;
}

const COPY = {
  he: {
    step1: 'קובץ הדוגמה',
    step1Body:
      'הורידו את הקובץ, מחקו את שורות הדוגמה ומלאו את הפעילויות שלכם. אפשר להוסיף עמודות משלכם — הן פשוט לא ייקראו. בגיליון השני יש הסבר לכל עמודה.',
    download: 'הורדת קובץ הדוגמה',
    step2: 'הקובץ המלא',
    step2Body: 'קובץ Excel‏ (xlsx) או CSV. שום דבר לא נוצר בשלב הזה.',
    choose: 'בחירת קובץ',
    reading: 'קורא…',
    step3: 'מה ייווצר',
    ready: 'מוכנות לייבוא',
    skipped: 'שורות שלא ייובאו',
    create: 'יצירת הפעילויות',
    creating: 'יוצר…',
    line: 'שורה',
    colTitle: 'כותרת',
    colType: 'סוג',
    colWhen: 'מתי',
    colPlace: 'מיקום',
    colSeats: 'מקומות',
    colVerdict: 'מצב',
    good: 'תקין',
    doneTitle: 'הייבוא הסתיים',
    doneBody: (created: number, skipped: number) =>
      `נוצרו ${created} פעילויות${skipped > 0 ? `, ו-${skipped} שורות דולגו` : ''}.`,
    toList: 'לרשימת הפעילויות',
    again: 'ייבוא קובץ נוסף',
    noRows: 'לא נמצאו שורות בקובץ.',
    missing: 'חסרות עמודות חובה בקובץ:',
    errors: {
      denied: 'אין הרשאה לייבא לכנס הזה.',
      missing: 'לא נבחר קובץ.',
      size: 'הקובץ גדול מדי (עד 5MB).',
      unreadable: 'לא הצלחתי לקרוא את הקובץ. ודאו שזה xlsx או csv.',
      columns: 'חסרות עמודות חובה.',
      failed: 'משהו השתבש. נסו שוב.',
    } as Record<string, string>,
  },
  en: {
    step1: 'The template',
    step1Body:
      'Download it, delete the example rows and fill in your own. Columns of your own are ignored, not refused. The second sheet explains every column.',
    download: 'Download the template',
    step2: 'Your filled file',
    step2Body: 'Excel (xlsx) or CSV. Nothing is created at this step.',
    choose: 'Choose a file',
    reading: 'Reading…',
    step3: 'What will be created',
    ready: 'ready to import',
    skipped: 'rows that will be skipped',
    create: 'Create the activities',
    creating: 'Creating…',
    line: 'Line',
    colTitle: 'Title',
    colType: 'Type',
    colWhen: 'When',
    colPlace: 'Place',
    colSeats: 'Seats',
    colVerdict: 'State',
    good: 'ready',
    doneTitle: 'Import finished',
    doneBody: (created: number, skipped: number) =>
      `${created} activities created${skipped > 0 ? `, ${skipped} rows skipped` : ''}.`,
    toList: 'To the activity list',
    again: 'Import another file',
    noRows: 'No rows were found in the file.',
    missing: 'Required columns are missing:',
    errors: {
      denied: 'Not allowed to import into this conference.',
      missing: 'No file chosen.',
      size: 'That file is too large (5MB maximum).',
      unreadable: 'I could not read that file. Make sure it is xlsx or csv.',
      columns: 'Required columns are missing.',
      failed: 'Something went wrong. Try again.',
    } as Record<string, string>,
  },
} as const;

const card =
  'rounded-xl border border-[var(--c-line)] bg-[var(--c-panel)] px-5 py-4';
const stepLabel =
  'text-[10px] font-medium tracking-[0.18em] text-[var(--c-text-faint)]';
const primary =
  'rounded-lg bg-[var(--c-bronze)] px-5 py-2.5 text-sm font-medium text-[var(--c-on-accent)] transition-colors hover:bg-[var(--c-bronze-hover)] disabled:opacity-50';
const quiet =
  'inline-flex items-center rounded-lg border border-[var(--c-line-strong)] px-4 py-2 text-xs text-[var(--c-text-soft)] transition-colors hover:border-[var(--c-bronze)]/50 hover:text-[var(--c-bronze)]';

const ImportPanel = ({ locale, columnLabels }: Props) => {
  const t = COPY[locale];
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const held = useRef<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState<'read' | 'commit' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ created: number; skipped: number } | null>(
    null,
  );

  const send = async (file: File, commit: boolean) => {
    const body = new FormData();
    body.set('file', file);
    if (commit) {
      body.set('commit', 'yes');
    }
    const response = await fetch('/studio/activity/import/sheet', {
      method: 'POST',
      body,
    });
    return (await response.json()) as
      | Preview
      | { ok: true; created: number; failed: number[]; skipped: number }
      | { ok: false; reason: string };
  };

  const onFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }
    held.current = file;
    setError(null);
    setDone(null);
    setBusy('read');
    try {
      const outcome = await send(file, false);
      if (!outcome.ok) {
        setError(t.errors[outcome.reason] ?? t.errors.failed!);
        setPreview(null);
        return;
      }
      setPreview(outcome as Preview);
    } catch {
      setError(t.errors.failed!);
    } finally {
      setBusy(null);
    }
  };

  const onCommit = async () => {
    const file = held.current;
    if (!file) {
      return;
    }
    setError(null);
    setBusy('commit');
    try {
      const outcome = await send(file, true);
      if (!outcome.ok) {
        setError(t.errors[outcome.reason] ?? t.errors.failed!);
        return;
      }
      const result = outcome as { created: number; skipped: number };
      setDone({ created: result.created, skipped: result.skipped });
      setPreview(null);
      held.current = null;
      router.refresh();
    } catch {
      setError(t.errors.failed!);
    } finally {
      setBusy(null);
    }
  };

  if (done) {
    return (
      <div className={card}>
        <h2 className="font-display text-xl">{t.doneTitle}</h2>
        <p className="mt-1 text-sm text-[var(--c-text-soft)]">
          {t.doneBody(done.created, done.skipped)}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/studio/activity" className={primary}>
            {t.toList}
          </Link>
          <button
            type="button"
            className={quiet}
            onClick={() => {
              setDone(null);
              setPreview(null);
            }}
          >
            {t.again}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <section className={card}>
        <p className={stepLabel}>1 · {t.step1.toUpperCase()}</p>
        <p className="mt-1.5 text-sm text-[var(--c-text-soft)]">{t.step1Body}</p>
        <a href="/studio/activity/import/sheet" download className={`${quiet} mt-3`}>
          {t.download}
        </a>
      </section>

      <section className={card}>
        <p className={stepLabel}>2 · {t.step2.toUpperCase()}</p>
        <p className="mt-1.5 text-sm text-[var(--c-text-soft)]">{t.step2Body}</p>
        <button
          type="button"
          className={`${quiet} mt-3`}
          disabled={busy !== null}
          onClick={() => fileRef.current?.click()}
        >
          {busy === 'read' ? t.reading : t.choose}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          className="hidden"
          onChange={(event) => {
            void onFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
        {error ? (
          <p className="mt-3 rounded-lg bg-[var(--c-danger)]/10 px-3 py-2 text-xs text-[var(--c-danger-text)]">
            {error}
          </p>
        ) : null}
      </section>

      {preview ? (
        <section className={card}>
          <p className={stepLabel}>3 · {t.step3.toUpperCase()}</p>

          {preview.missingColumns.length > 0 ? (
            <p className="mt-2 rounded-lg bg-[var(--c-danger)]/10 px-3 py-2 text-xs text-[var(--c-danger-text)]">
              {t.missing}{' '}
              {preview.missingColumns
                .map((column) => columnLabels[column] ?? column)
                .join(', ')}
            </p>
          ) : null}

          {preview.rows.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--c-text-soft)]">{t.noRows}</p>
          ) : (
            <>
              <p className="mt-2 flex flex-wrap items-baseline gap-x-3 text-sm">
                <span className="font-display text-2xl tabular-nums text-[var(--c-bronze)]">
                  {preview.readyCount}
                </span>
                <span className="text-[var(--c-text-soft)]">{t.ready}</span>
                {preview.rows.length - preview.readyCount > 0 ? (
                  <span className="text-[var(--c-danger-text)]">
                    · {preview.rows.length - preview.readyCount} {t.skipped}
                  </span>
                ) : null}
              </p>

              <div className="mt-3 max-h-[46vh] overflow-auto rounded-lg border border-[var(--c-line)]">
                <table className="w-full min-w-[680px] border-collapse text-sm">
                  <thead className="sticky top-0 bg-[var(--c-panel)]">
                    <tr className="border-b border-[var(--c-line)] text-[10px] tracking-[0.16em] text-[var(--c-text-faint)]">
                      <th className="px-3 py-2 text-start">{t.line}</th>
                      <th className="px-3 py-2 text-start">{t.colTitle}</th>
                      <th className="px-3 py-2 text-start">{t.colType}</th>
                      <th className="px-3 py-2 text-start">{t.colWhen}</th>
                      <th className="px-3 py-2 text-start">{t.colPlace}</th>
                      <th className="px-3 py-2 text-start">{t.colSeats}</th>
                      <th className="px-3 py-2 text-start">{t.colVerdict}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row) => (
                      <tr
                        key={row.line}
                        className={`border-b border-[var(--c-line)] last:border-0 ${
                          row.problems.length > 0 ? 'bg-[var(--c-danger)]/5' : ''
                        }`}
                      >
                        <td className="px-3 py-2 tabular-nums text-[var(--c-text-faint)]">
                          {row.line}
                        </td>
                        <td className="px-3 py-2">{row.title || '—'}</td>
                        <td className="px-3 py-2 text-[var(--c-text-soft)]">
                          {row.type || '—'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-[var(--c-text-soft)]">
                          {row.date ? `${row.date} ${row.from}–${row.to}` : '—'}
                        </td>
                        <td className="px-3 py-2 text-[var(--c-text-soft)]">
                          {row.place || '—'}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-[var(--c-text-soft)]">
                          {row.capacity || '—'}
                        </td>
                        <td className="px-3 py-2">
                          {row.problems.length === 0 ? (
                            <span className="text-[var(--c-live)]">{t.good}</span>
                          ) : (
                            <ul className="flex flex-col gap-0.5 text-xs text-[var(--c-danger-text)]">
                              {row.problems.map((problem) => (
                                <li key={problem}>{problem}</li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                className={`${primary} mt-4`}
                disabled={busy !== null || preview.readyCount === 0}
                onClick={() => void onCommit()}
              >
                {busy === 'commit'
                  ? t.creating
                  : `${t.create} (${preview.readyCount})`}
              </button>
            </>
          )}
        </section>
      ) : null}
    </div>
  );
};

export default ImportPanel;
