'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import type { MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { Locale } from '@/config/locales';
import { withBasePath } from '@/config/site';
import type { ActivityRoster, RosterPerson, RosterStatus } from '@/features/studio';
import { ACTIVITY_LANGUAGE_LABELS, activityLanguagesOf } from '@/shared/constants/activity-facets';
import { activityRegistrantsAction, releaseActivityPlaceAction } from './actions';

/*
 * Who holds a place in this activity, in a window over the list.
 *
 * The activities screen counts sign-ups; this names them. A manager
 * opens it to see who is coming, to reach one of them, to copy every
 * address into an email, to take the list away as Excel — and, when a
 * guest asks or a place must be freed, to give that place back on the
 * guest's behalf. The release is the guest's own cancellation run from
 * the desk: the guest is told, the next in line moves up, and the
 * history records who did it.
 *
 * A native dialog, because the browser already knows how a modal
 * behaves: focus stays inside, Escape closes, and focus returns to the
 * button that opened it. The list is read when the window opens, not
 * with the page — a programme is thousands of names nobody asked for
 * until now.
 */
interface Props {
  locale: Locale;
  slug: string;
  sessionId: string;
  title: string;
  canRelease: boolean;
  onClose: () => void;
}

type Phase = { kind: 'loading' } | { kind: 'failed' } | { kind: 'ready'; roster: ActivityRoster };

const T = (locale: Locale) => ({
  eyebrow: locale === 'he' ? 'הנרשמים לפעילות' : 'Registered for this activity',
  close: locale === 'he' ? 'סגירה' : 'Close',
  loading: locale === 'he' ? 'טוען את הרשימה…' : 'Loading the list…',
  failed: locale === 'he' ? 'לא הצלחנו לטעון את הרשימה.' : 'The list could not be loaded.',
  retry: locale === 'he' ? 'לנסות שוב' : 'Try again',
  empty: locale === 'he' ? 'עוד אין נרשמים לפעילות הזו.' : 'Nobody has signed up for this activity yet.',
  noMatch: locale === 'he' ? 'אין נרשמים שמתאימים לחיפוש.' : 'No registrants match the search.',
  search: locale === 'he' ? 'חיפוש לפי שם, טלפון או אימייל…' : 'Search by name, phone or email…',
  excel: locale === 'he' ? 'ייצוא לאקסל' : 'Export to Excel',
  copyEmails: locale === 'he' ? 'העתקת כל האימיילים' : 'Copy all emails',
  copied: (n: number) =>
    locale === 'he' ? `${n} כתובות הועתקו ללוח.` : `${n} addresses copied to the clipboard.`,
  copyFailed: locale === 'he' ? 'ההעתקה לא הצליחה — אפשר לסמן ולהעתיק מהטבלה.' : 'Copying failed — select and copy from the table instead.',
  colNo: '#',
  colName: locale === 'he' ? 'שם' : 'Name',
  colPhone: locale === 'he' ? 'טלפון' : 'Phone',
  colEmail: locale === 'he' ? 'אימייל' : 'Email',
  colStatus: locale === 'he' ? 'סטטוס' : 'Status',
  colLanguage: locale === 'he' ? 'שפה מבוקשת' : 'Requested language',
  colWhen: locale === 'he' ? 'מועד ההרשמה' : 'Registered on',
  colActions: locale === 'he' ? 'פעולות' : 'Actions',
  release: locale === 'he' ? 'ביטול הרשמה' : 'Cancel registration',
  releaseOf: (name: string) =>
    locale === 'he' ? `ביטול ההרשמה של ${name}` : `Cancel the registration of ${name}`,
  confirmAsk: (name: string) =>
    locale === 'he' ? `לבטל את ההרשמה של ${name}?` : `Cancel ${name}’s registration?`,
  confirmYes: locale === 'he' ? 'כן, לבטל' : 'Yes, cancel it',
  confirmNo: locale === 'he' ? 'לא' : 'No',
  releasing: locale === 'he' ? 'מבטל…' : 'Cancelling…',
  released: (name: string) =>
    locale === 'he'
      ? `ההרשמה של ${name} בוטלה והמקום שוחרר. אם מישהו המתין בתור — מקומו אושר.`
      : `${name}’s registration was cancelled and the place freed. If someone was waiting, their place is now confirmed.`,
  releaseFailed: (name: string) =>
    locale === 'he'
      ? `לא הצלחנו לבטל את ההרשמה של ${name}. ייתכן שהיא כבר השתנתה — הרשימה רועננה.`
      : `${name}’s registration could not be cancelled. It may already have changed — the list was refreshed.`,
  cannotRelease: locale === 'he' ? 'כבר נכח/ה — אין מה לבטל' : 'Already checked in — nothing to cancel',
  counts: (confirmed: number, waiting: number, pending: number) => {
    const parts: string[] = [];
    if (locale === 'he') {
      parts.push(confirmed === 1 ? 'רשום/ה אחד/ת' : `${confirmed} רשומים`);
      if (waiting > 0) parts.push(`${waiting} ברשימת המתנה`);
      if (pending > 0) parts.push(`${pending} ממתינים לאישור`);
    } else {
      parts.push(confirmed === 1 ? '1 registered' : `${confirmed} registered`);
      if (waiting > 0) parts.push(`${waiting} on the waiting list`);
      if (pending > 0) parts.push(`${pending} awaiting approval`);
    }
    return parts.join(' · ');
  },
});

const STATUS_META: Record<RosterStatus, { he: string; en: string; cls: string }> = {
  confirmed: { he: 'רשום/ה', en: 'Registered', cls: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' },
  attended: { he: 'הגיע/ה', en: 'Checked in', cls: 'border-sky-400/30 bg-sky-400/10 text-sky-300' },
  pending: { he: 'ממתין/ה לאישור', en: 'Awaiting approval', cls: 'border-amber-400/30 bg-amber-400/10 text-amber-300' },
  waitlisted: { he: 'ברשימת המתנה', en: 'Waiting list', cls: 'border-violet-400/30 bg-violet-400/10 text-violet-300' },
};

const BTN =
  'inline-flex items-center gap-1.5 rounded-md border border-[var(--c-line)] px-2.5 py-1 text-xs text-[var(--c-text-soft)] transition-colors hover:border-[var(--c-bronze)]/50 hover:text-[var(--c-bronze)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-bronze)]';
const DANGER =
  'inline-flex items-center gap-1.5 rounded-md border border-rose-400/30 px-2.5 py-1 text-xs text-rose-300/90 transition-colors hover:bg-rose-400/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300';

const Download = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true" className="size-3.5 flex-none" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 3v10M5.5 8.5 10 13l4.5-4.5M4 16.5h12" />
  </svg>
);

/* The language a person asked for, in the organiser's words; blank where the activity held no vote. */
const languageOf = (code: string | undefined, locale: Locale): string => {
  const known = activityLanguagesOf(code ? [code] : [])[0];
  return known ? ACTIVITY_LANGUAGE_LABELS[known][locale] : '';
};

const whenOf = (iso: string | undefined, tag: string): string => {
  if (!iso || Number.isNaN(Date.parse(iso))) return '—';
  return new Intl.DateTimeFormat(tag, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
};

/* A phone number is something to tap, where there is one. */
const Phone = ({ person }: { person: RosterPerson }) =>
  person.phone ? (
    <a href={`tel:${person.phone.replace(/[^\d+]/g, '')}`} dir="ltr" className="inline-block tabular-nums hover:text-[var(--c-text)]">
      {person.phone}
    </a>
  ) : (
    <span>—</span>
  );

const Email = ({ person }: { person: RosterPerson }) =>
  person.email ? (
    <a href={`mailto:${person.email}`} dir="ltr" className="inline-block break-all hover:text-[var(--c-text)]">
      {person.email}
    </a>
  ) : (
    <span>—</span>
  );

const matches = (person: RosterPerson, needle: string): boolean => {
  const q = needle.trim().toLowerCase();
  if (q === '') return true;
  return [person.name, person.phone, person.email].some((field) => field.toLowerCase().includes(q));
};

const RegistrantsDialog = ({ locale, slug, sessionId, title, canRelease, onClose }: Props) => {
  const t = T(locale);
  const tag = locale === 'he' ? 'he-IL' : 'en-GB';
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [query, setQuery] = useState('');
  const [asking, setAsking] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [, startTransition] = useTransition();

  const load = useCallback(() => {
    setPhase({ kind: 'loading' });
    activityRegistrantsAction({ slug, sessionId, locale })
      .then((roster) => setPhase(roster ? { kind: 'ready', roster } : { kind: 'failed' }))
      .catch(() => setPhase({ kind: 'failed' }));
  }, [slug, sessionId, locale]);

  /* Open as a modal the moment it mounts; read the list at the same time. */
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
    load();
  }, [load]);

  const people = useMemo(() => (phase.kind === 'ready' ? phase.roster.people : []), [phase]);
  const shown = useMemo(() => people.filter((person) => matches(person, query)), [people, query]);
  const hasLanguage = people.some((person) => Boolean(person.language));
  const tally = {
    confirmed: people.filter((p) => p.status === 'confirmed' || p.status === 'attended').length,
    waiting: people.filter((p) => p.status === 'waitlisted').length,
    pending: people.filter((p) => p.status === 'pending').length,
  };

  const copyEmails = async () => {
    const addresses = [...new Set(people.map((p) => p.email.trim()).filter(Boolean))];
    try {
      await navigator.clipboard.writeText(addresses.join(', '));
      setNotice(t.copied(addresses.length));
    } catch {
      setNotice(t.copyFailed);
    }
  };

  const release = (person: RosterPerson) => {
    setAsking(null);
    setBusy(person.participantId);
    setNotice('');
    releaseActivityPlaceAction({ slug, sessionId, participantId: person.participantId, locale })
      .then(({ released, roster }) => {
        if (roster) setPhase({ kind: 'ready', roster });
        setNotice(released ? t.released(person.name) : t.releaseFailed(person.name));
        /* The counts on the screen behind come from the server; ask for them again. */
        if (released) startTransition(() => router.refresh());
      })
      .catch(() => setNotice(t.releaseFailed(person.name)))
      .finally(() => setBusy(null));
  };

  /* A click on the backdrop — the dialog element itself, outside its panel — closes. */
  const onBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === ref.current) onClose();
  };

  const columns = 6 + (hasLanguage ? 1 : 0) + (canRelease ? 1 : 0);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={onBackdrop}
      aria-labelledby="registrants-title"
      className="m-auto w-[min(100vw-2rem,68rem)] max-h-[90vh] rounded-xl border border-[var(--c-line)] bg-[var(--c-deep)] p-0 text-[var(--c-text)] shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-[2px]"
    >
      <div className="flex max-h-[90vh] flex-col">
        <header className="flex flex-wrap items-start gap-3 border-b border-[var(--c-line)] px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--c-bronze)]">{t.eyebrow}</p>
            <h2 id="registrants-title" className="font-display mt-0.5 text-xl font-medium leading-tight text-[var(--c-text)]">
              {title}
            </h2>
            {phase.kind === 'ready' ? (
              <p className="mt-1 text-sm text-[var(--c-text-soft)]">{t.counts(tally.confirmed, tally.waiting, tally.pending)}</p>
            ) : null}
          </div>
          <button type="button" onClick={onClose} className={BTN}>
            {t.close}
          </button>
        </header>

        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--c-line)] px-5 py-3">
          <label className="w-full min-w-0 md:w-auto md:flex-1">
            <span className="sr-only">{t.search}</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.search}
              disabled={people.length === 0}
              className="w-full rounded-lg border border-[var(--c-line)] bg-[rgba(7,19,36,0.5)] px-3 py-2 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text-faint)] disabled:opacity-50"
            />
          </label>
          <button type="button" onClick={copyEmails} disabled={people.length === 0} className={`${BTN} disabled:opacity-50`}>
            {t.copyEmails}
          </button>
          <a
            href={withBasePath(`/studio/activity/roster?session=${encodeURIComponent(sessionId)}`)}
            className={BTN}
          >
            <Download />
            {t.excel}
          </a>
        </div>

        <p aria-live="polite" className={`px-5 text-sm text-[var(--c-bronze)] ${notice ? 'py-2' : 'sr-only'}`}>
          {notice}
        </p>

        <div className="min-h-0 overflow-auto">
          {phase.kind === 'loading' ? (
            <p className="p-8 text-center text-sm text-[var(--c-text-soft)]" role="status">
              {t.loading}
            </p>
          ) : phase.kind === 'failed' ? (
            <div className="flex flex-col items-center gap-3 p-8 text-sm text-[var(--c-text-soft)]">
              <p>{t.failed}</p>
              <button type="button" onClick={load} className={BTN}>
                {t.retry}
              </button>
            </div>
          ) : people.length === 0 ? (
            <p className="p-8 text-center text-sm text-[var(--c-text-soft)]">{t.empty}</p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-[var(--c-deep)]">
                <tr className="text-[var(--c-text-faint)]">
                  <th scope="col" className="hidden p-3 text-start font-medium tabular-nums md:table-cell">{t.colNo}</th>
                  <th scope="col" className="p-3 text-start font-medium">{t.colName}</th>
                  <th scope="col" className="hidden p-3 text-start font-medium md:table-cell">{t.colPhone}</th>
                  <th scope="col" className="hidden p-3 text-start font-medium md:table-cell">{t.colEmail}</th>
                  <th scope="col" className="p-3 text-start font-medium">{t.colStatus}</th>
                  {hasLanguage ? <th scope="col" className="hidden p-3 text-start font-medium md:table-cell">{t.colLanguage}</th> : null}
                  <th scope="col" className="hidden p-3 text-start font-medium md:table-cell">{t.colWhen}</th>
                  {canRelease ? <th scope="col" className="p-3 text-end font-medium">{t.colActions}</th> : null}
                </tr>
              </thead>
              <tbody>
                {shown.length === 0 ? (
                  <tr>
                    <td colSpan={columns} className="p-8 text-center text-[var(--c-text-soft)]">
                      {t.noMatch}
                    </td>
                  </tr>
                ) : (
                  shown.map((person, index) => {
                    const meta = STATUS_META[person.status];
                    const isBusy = busy === person.participantId;
                    const isAsking = asking === person.participantId;
                    return (
                      <tr key={`${person.participantId}-${person.status}`} className="border-t border-[var(--c-line)] align-middle">
                        <td className="hidden p-3 tabular-nums text-[var(--c-text-faint)] md:table-cell">{index + 1}</td>
                        <td className="p-3">
                          <p className="font-medium text-[var(--c-text)]">{person.name || '—'}</p>
                          {/* On a narrow screen the two ways to reach them sit under the name. */}
                          <p className="mt-0.5 flex flex-col gap-0.5 text-xs text-[var(--c-text-soft)] md:hidden">
                            <Phone person={person} />
                            <Email person={person} />
                            {whenOf(person.registeredAt, tag) !== '—' ? (
                              <span dir="ltr" className="self-start tabular-nums text-[var(--c-text-faint)]">{whenOf(person.registeredAt, tag)}</span>
                            ) : null}
                          </p>
                        </td>
                        <td className="hidden p-3 text-[var(--c-text-soft)] md:table-cell">
                          <Phone person={person} />
                        </td>
                        <td className="hidden p-3 text-[var(--c-text-soft)] md:table-cell">
                          <Email person={person} />
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs ${meta.cls}`}>
                            {meta[locale]}
                          </span>
                        </td>
                        {hasLanguage ? (
                          <td className="hidden p-3 text-[var(--c-text-soft)] md:table-cell">{languageOf(person.language, locale) || '—'}</td>
                        ) : null}
                        <td className="hidden p-3 text-[var(--c-text-soft)] md:table-cell">
                          <span dir="ltr" className="tabular-nums">{whenOf(person.registeredAt, tag)}</span>
                        </td>
                        {canRelease ? (
                          <td className="p-3">
                            <div className="flex items-center justify-end gap-2">
                              {person.status === 'attended' ? (
                                <span className="text-xs text-[var(--c-text-faint)]">{t.cannotRelease}</span>
                              ) : isBusy ? (
                                <span className="text-xs text-[var(--c-text-soft)]" role="status">
                                  {t.releasing}
                                </span>
                              ) : isAsking ? (
                                <span className="flex flex-col items-end gap-1.5" role="group" aria-label={t.confirmAsk(person.name)}>
                                  <span className="text-xs text-[var(--c-text-soft)]">{t.confirmAsk(person.name)}</span>
                                  <span className="flex items-center gap-2">
                                    <button type="button" onClick={() => release(person)} className={`${DANGER} whitespace-nowrap`} autoFocus>
                                      {t.confirmYes}
                                    </button>
                                    <button type="button" onClick={() => setAsking(null)} className={BTN}>
                                      {t.confirmNo}
                                    </button>
                                  </span>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setAsking(person.participantId)}
                                  disabled={busy !== null}
                                  aria-label={t.releaseOf(person.name)}
                                  className={`${DANGER} whitespace-nowrap disabled:opacity-50`}
                                >
                                  {t.release}
                                </button>
                              )}
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </dialog>
  );
};

export default RegistrantsDialog;
