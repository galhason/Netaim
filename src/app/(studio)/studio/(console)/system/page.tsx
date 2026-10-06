import Link from 'next/link';
import type { Locale } from '@/config/locales';
import { ConsoleDenied, ConsoleShell, getStudioAccess, getStudioLocale } from '@/features/studio';
import {
  SYSTEM_COPY,
  SYSTEM_KIND_LABELS,
  detailLines,
  listSystemUpdates,
  summarizeSystem,
  type SystemUpdate,
  type SystemUpdateKind,
} from '@/features/system';
import { can } from '@/permission-engine';
import { DEFAULT_VENUE_TIMEZONE } from '@/shared/utils/format-date';
import { editSystemUpdateAction, publishSystemUpdateAction, removeSystemUpdateAction } from './actions';
import UpdateForm from './update-form';

/*
 * The system page: what was released, in which version and when.
 *
 * Every Netaim role reads it (system:read); the developer alone writes
 * it (system:manage) — for everyone else the page is the same record
 * with no form and no buttons, and a line saying why. The current
 * version is the newest release's.
 */
interface SystemPageProps {
  searchParams: Promise<{ edit?: string; done?: string; error?: string }>;
}

const CARD = 'rounded-xl border border-[var(--c-line)] bg-[var(--c-panel)]';
const QUIET =
  'inline-flex min-h-8 items-center rounded-md border border-[var(--c-line-strong)] px-3 text-xs text-[var(--c-text-soft)] transition-colors hover:border-[var(--c-bronze)]/60 hover:text-[var(--c-bronze)]';
const DANGER =
  'inline-flex min-h-8 items-center rounded-md border border-[var(--c-danger)]/50 px-3 text-xs text-[var(--c-danger-text)] transition-colors hover:bg-[var(--c-danger)]/10';

const KIND_TONE: Record<SystemUpdateKind, string> = {
  feature: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  improvement: 'border-sky-400/30 bg-sky-400/10 text-sky-300',
  fix: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  security: 'border-rose-400/30 bg-rose-400/10 text-rose-300',
};

const DONE = {
  published: SYSTEM_COPY.published,
  saved: SYSTEM_COPY.saved,
  removed: SYSTEM_COPY.removed,
} as const;

const dayLabel = (day: string | null, locale: Locale): string => {
  if (!day) return '—';
  const parsed = new Date(`${day}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
};

const todayOnClock = (): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: DEFAULT_VENUE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

const Entry = ({
  update,
  locale,
  manage,
  newest,
}: {
  update: SystemUpdate;
  locale: Locale;
  manage: boolean;
  newest: boolean;
}) => {
  const words = SYSTEM_COPY;
  const lines = detailLines(update.details);
  return (
    <li className="relative ps-8">
      <span
        aria-hidden="true"
        className={`absolute start-0 top-1.5 grid size-4 place-items-center rounded-full border-2 ${
          newest ? 'border-[var(--c-bronze)] bg-[var(--c-bronze)]/30' : 'border-[var(--c-line-strong)] bg-[var(--c-deep)]'
        }`}
      />
      <article className={`${CARD} p-5`}>
        <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span dir="ltr" className="rounded-md bg-[var(--c-bronze)]/15 px-2 py-0.5 font-mono text-sm font-semibold text-[var(--c-bronze)]">
            v{update.version}
          </span>
          <span className={`rounded-full border px-2.5 py-0.5 text-[11px] ${KIND_TONE[update.kind]}`}>
            {SYSTEM_KIND_LABELS[update.kind][locale]}
          </span>
          <time dateTime={update.releasedAt} className="text-xs text-[var(--c-text-faint)]">
            {dayLabel(update.releasedAt, locale)}
          </time>
          {manage ? (
            <span className="ms-auto flex items-center gap-2">
              <Link href={`/studio/system?edit=${encodeURIComponent(update.id)}#edit`} className={QUIET}>
                {words.edit[locale]}
              </Link>
              <details className="relative">
                <summary className={`${DANGER} cursor-pointer list-none`}>{words.remove[locale]}</summary>
                <form
                  action={removeSystemUpdateAction}
                  className="absolute end-0 top-full z-10 mt-2 flex w-56 flex-col gap-2 rounded-lg border border-[var(--c-line-strong)] bg-[var(--c-deep)] p-3 text-xs text-[var(--c-text-soft)] shadow-2xl"
                >
                  <input type="hidden" name="id" value={update.id} />
                  <span>{words.removeConfirm[locale]}</span>
                  <button type="submit" className={DANGER}>
                    {words.remove[locale]}
                  </button>
                </form>
              </details>
            </span>
          ) : null}
        </header>
        <h3 className="mt-3 text-base font-semibold text-[var(--c-text)]">{update.title}</h3>
        {lines.length > 0 ? (
          <ul className="mt-2 flex list-disc flex-col gap-1 ps-5 text-sm leading-relaxed text-[var(--c-text-soft)] marker:text-[var(--c-text-faint)]">
            {lines.map((line, index) => (
              <li key={`${index}-${line}`}>{line}</li>
            ))}
          </ul>
        ) : null}
        {update.publishedByName ? (
          <p className="mt-3 text-[11px] text-[var(--c-text-faint)]">
            {words.by[locale]}: {update.publishedByName}
          </p>
        ) : null}
      </article>
    </li>
  );
};

const SystemPage = async ({ searchParams }: SystemPageProps) => {
  const locale = await getStudioLocale();
  const access = await getStudioAccess();
  const words = SYSTEM_COPY;
  if (!access || !can(access.grants, 'system:read')) {
    return <ConsoleDenied locale={locale} title={words.title[locale]} userName={access?.creator.name ?? ''} />;
  }
  const manage = can(access.grants, 'system:manage');
  const { edit, done, error } = await searchParams;
  const updates = await listSystemUpdates();
  const summary = summarizeSystem(updates);
  const editing = manage && edit ? updates.find((update) => update.id === edit) : undefined;
  const today = todayOnClock();
  const notice = done && done in DONE ? DONE[done as keyof typeof DONE][locale] : null;

  const stats = [
    { label: words.currentVersion[locale], value: summary.currentVersion ? `v${summary.currentVersion}` : words.noVersion[locale], ltr: Boolean(summary.currentVersion) },
    { label: words.lastRelease[locale], value: dayLabel(summary.lastReleasedAt, locale), ltr: false },
    { label: words.totalUpdates[locale], value: String(summary.total), ltr: true },
  ];

  return (
    <ConsoleShell
      locale={locale}
      userName={access.creator.name}
      breadcrumb={<span className="font-medium text-[var(--c-text)]">{words.title[locale]}</span>}
    >
      <div className="mx-auto flex h-full w-full max-w-4xl flex-col gap-6 overflow-y-auto px-6 py-8">
        <header>
          <h1 className="font-display text-3xl font-medium text-[var(--c-text)]">{words.title[locale]}</h1>
          <p className="mt-1 text-sm text-[var(--c-text-soft)]">{words.sub[locale]}</p>
        </header>

        {notice ? (
          <p role="status" className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 py-2.5 text-sm text-emerald-300">
            {notice}
          </p>
        ) : null}
        {error === 'failed' ? (
          <p role="alert" className="rounded-lg border border-[var(--c-danger)]/40 bg-[var(--c-danger)]/10 px-4 py-2.5 text-sm text-[var(--c-danger-text)]">
            {words.failed[locale]}
          </p>
        ) : null}

        <section aria-label={words.currentVersion[locale]} className="grid gap-3 sm:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className={`${CARD} p-4`}>
              <p dir={stat.ltr ? 'ltr' : undefined} className="font-display text-2xl font-semibold text-[var(--c-text)] [unicode-bidi:plaintext] text-start">
                {stat.value}
              </p>
              <p className="mt-1 text-xs text-[var(--c-text-soft)]">{stat.label}</p>
            </div>
          ))}
        </section>

        {manage ? (
          <section id="edit" aria-labelledby="system-form-title" className={`${CARD} p-5`}>
            <h2 id="system-form-title" className="mb-4 text-sm font-semibold text-[var(--c-text)]">
              {editing ? `${words.editUpdate[locale]} · v${editing.version}` : words.newUpdate[locale]}
            </h2>
            <UpdateForm
              key={editing?.id ?? 'new'}
              locale={locale}
              action={editing ? editSystemUpdateAction : publishSystemUpdateAction}
              {...(editing ? { update: editing } : {})}
              today={today}
            />
          </section>
        ) : (
          <p className="rounded-lg border border-[var(--c-line)] bg-[var(--c-panel)] px-4 py-2.5 text-sm text-[var(--c-text-soft)]">
            {words.readOnly[locale]}
          </p>
        )}

        <section aria-labelledby="system-timeline-title">
          <h2 id="system-timeline-title" className="mb-4 text-sm font-semibold text-[var(--c-text)]">
            {words.timeline[locale]}
          </h2>
          {updates.length === 0 ? (
            <p className="text-sm text-[var(--c-text-soft)]">{words.empty[locale]}</p>
          ) : (
            <ol className="relative flex flex-col gap-4 before:absolute before:bottom-2 before:start-[7px] before:top-2 before:w-px before:bg-[var(--c-line)]">
              {updates.map((update, index) => (
                <Entry key={update.id} update={update} locale={locale} manage={manage} newest={index === 0} />
              ))}
            </ol>
          )}
        </section>
      </div>
    </ConsoleShell>
  );
};

/* Who is asking decides what is drawn — rendered per request, never shared. */
export const dynamic = 'force-dynamic';

export default SystemPage;
