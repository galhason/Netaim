import Link from 'next/link';
import { findEvent, listEvents } from '@/features/events';
import {
  getRegistrationCounts,
  listRegistrations,
} from '@/features/registration';
import { TERMINAL_STATUSES } from '@/registration-engine';
import {
  CONSOLE_UI,
  ConsoleShell,
  REGISTRATION_STATUS_LABELS,
  getStudioCreator,
  getStudioLocale,
} from '@/features/studio';
import { removeEventRegistrationAction } from '../actions';

/*
 * Conference info: every experience with its headcount, and — one click
 * in — who is registered, with the door to remove a registrant. Read-only
 * truth from the registration engine; removal runs the same cancel the
 * guest's own flow uses, so capacity and waitlists follow. Only active
 * registrations are listed, so a removed place disappears from the list.
 */
interface InsightsPageProps {
  searchParams: Promise<{ event?: string }>;
}

const dangerButton =
  'rounded-lg border border-[#B0442F]/50 px-3 py-1 text-[11px] text-[#E39A8B] transition-colors hover:bg-[#B0442F]/10';

const InsightsPage = async ({ searchParams }: InsightsPageProps) => {
  const { event: eventParam } = await searchParams;
  const locale = await getStudioLocale();
  const creator = await getStudioCreator();

  if (eventParam) {
    const [event, registrations] = await Promise.all([
      findEvent(eventParam).catch(() => null),
      listRegistrations(eventParam).catch(() => []),
    ]);
    const title = event?.title ?? eventParam;
    const active = registrations.filter(
      (registration) => !TERMINAL_STATUSES.includes(registration.status),
    );
    const counts = active.reduce(
      (sum, registration) => ({
        confirmed: sum.confirmed + (registration.status === 'confirmed' ? 1 : 0),
        pending: sum.pending + (registration.status === 'pending' ? 1 : 0),
        waitlisted:
          sum.waitlisted + (registration.status === 'waitlisted' ? 1 : 0),
      }),
      { confirmed: 0, pending: 0, waitlisted: 0 },
    );

    return (
      <ConsoleShell
        locale={locale}
        userName={creator?.name ?? ''}
        breadcrumb={
          <>
            <Link
              href="/studio/insights"
              className="transition-colors hover:text-[var(--c-text)]"
            >
              {CONSOLE_UI.insightsTitle[locale]}
            </Link>
            <span aria-hidden="true">›</span>
            <span className="truncate font-medium text-[var(--c-text)]">
              {title}
            </span>
          </>
        }
      >
        <div className="mx-auto flex h-full max-w-3xl flex-col gap-6 overflow-y-auto px-6 py-8">
          <header>
            <Link
              href="/studio/insights"
              className="text-xs text-[var(--c-text-soft)] underline-offset-4 transition-colors hover:text-[var(--c-bronze)] hover:underline"
            >
              ‹ {CONSOLE_UI.insightsBack[locale]}
            </Link>
            <h1 className="mt-2 font-display text-3xl font-medium">{title}</h1>
            <p className="mt-1 text-sm text-[var(--c-text-soft)]">
              {CONSOLE_UI.registrantsSub[locale]}
            </p>
          </header>

          <div className="flex gap-8 rounded-xl border border-[var(--c-line)] bg-[var(--c-glass)] px-6 py-5">
            <div>
              <p className="font-display text-2xl">{counts.confirmed}</p>
              <p className="text-[10px] tracking-[0.14em] text-[var(--c-text-faint)]">
                {CONSOLE_UI.colConfirmed[locale]}
              </p>
            </div>
            <div>
              <p className="font-display text-2xl">{counts.pending}</p>
              <p className="text-[10px] tracking-[0.14em] text-[var(--c-text-faint)]">
                {CONSOLE_UI.colPending[locale]}
              </p>
            </div>
            <div>
              <p className="font-display text-2xl">{counts.waitlisted}</p>
              <p className="text-[10px] tracking-[0.14em] text-[var(--c-text-faint)]">
                {CONSOLE_UI.colWaitlist[locale]}
              </p>
            </div>
          </div>

          {active.length > 0 ? (
            <ul className="flex flex-col gap-2.5">
              {active.map((registration) => {
                const name =
                  registration.participant.name ||
                  registration.participant.email;
                return (
                  <li
                    key={registration.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--c-line)] bg-[var(--c-panel)] px-5 py-3.5"
                  >
                    <span className="grid size-9 flex-none place-items-center rounded-full bg-[var(--c-bronze)]/20 text-sm font-medium text-[var(--c-bronze)]">
                      {(name || '?').slice(0, 1).toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{name}</span>
                      {registration.participant.email ? (
                        <span className="block truncate text-xs text-[var(--c-text-soft)]">
                          {registration.participant.email}
                        </span>
                      ) : null}
                    </span>
                    <span className="ms-auto flex-none rounded-full border border-[var(--c-line-strong)] px-2.5 py-0.5 text-[10px] tracking-widest text-[var(--c-text-soft)]">
                      {REGISTRATION_STATUS_LABELS[registration.status]?.[
                        locale
                      ] ?? registration.status}
                    </span>
                    <form
                      action={removeEventRegistrationAction}
                      className="flex-none"
                    >
                      <input
                        type="hidden"
                        name="slug"
                        value={event?.slug ?? eventParam}
                      />
                      <input
                        type="hidden"
                        name="registrationId"
                        value={registration.id}
                      />
                      <button
                        type="submit"
                        className={dangerButton}
                        title={CONSOLE_UI.removeRegistrantHint[locale]}
                      >
                        {CONSOLE_UI.removeRegistrant[locale]}
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-xl border border-[var(--c-line)] bg-[var(--c-panel)] px-5 py-6 text-sm text-[var(--c-text-faint)]">
              {CONSOLE_UI.noRegistrantsYet[locale]}
            </p>
          )}
        </div>
      </ConsoleShell>
    );
  }

  const events = await listEvents().catch(() => []);

  const rows = await Promise.all(
    events.map(async (event) => ({
      event,
      counts: await getRegistrationCounts(event.slug).catch(() => ({
        confirmed: 0,
        pending: 0,
        waitlisted: 0,
      })),
    })),
  );

  const totals = rows.reduce(
    (sum, row) => ({
      confirmed: sum.confirmed + row.counts.confirmed,
      pending: sum.pending + row.counts.pending,
      waitlisted: sum.waitlisted + row.counts.waitlisted,
    }),
    { confirmed: 0, pending: 0, waitlisted: 0 },
  );

  return (
    <ConsoleShell
      locale={locale}
      userName={creator?.name ?? ''}
      breadcrumb={
        <span className="font-medium text-[var(--c-text)]">
          {CONSOLE_UI.insightsTitle[locale]}
        </span>
      }
    >
      <div className="mx-auto flex h-full max-w-3xl flex-col gap-6 overflow-y-auto px-6 py-8">
        <header>
          <h1 className="font-display text-3xl font-medium">
            {CONSOLE_UI.insightsTitle[locale]}
          </h1>
          <p className="mt-1 text-sm text-[var(--c-text-soft)]">
            {CONSOLE_UI.insightsSub[locale]}
          </p>
        </header>

        <div className="flex gap-8 rounded-xl border border-[var(--c-line)] bg-[var(--c-glass)] px-6 py-5">
          <div>
            <p className="font-display text-2xl">{totals.confirmed}</p>
            <p className="text-[10px] tracking-[0.14em] text-[var(--c-text-faint)]">
              {CONSOLE_UI.colConfirmed[locale]}
            </p>
          </div>
          <div>
            <p className="font-display text-2xl">{totals.pending}</p>
            <p className="text-[10px] tracking-[0.14em] text-[var(--c-text-faint)]">
              {CONSOLE_UI.colPending[locale]}
            </p>
          </div>
          <div>
            <p className="font-display text-2xl">{totals.waitlisted}</p>
            <p className="text-[10px] tracking-[0.14em] text-[var(--c-text-faint)]">
              {CONSOLE_UI.colWaitlist[locale]}
            </p>
          </div>
        </div>

        <ul className="flex flex-col gap-2.5">
          {rows.map(({ event, counts }) => (
            <li
              key={event.id}
              className="flex items-center gap-4 rounded-xl border border-[var(--c-line)] bg-[var(--c-panel)] px-5 py-3.5"
            >
              <Link
                href={`/studio/insights?event=${encodeURIComponent(event.slug)}`}
                className="min-w-0 truncate font-medium underline-offset-4 hover:underline"
              >
                {event.title}
              </Link>
              <span
                className={`flex-none rounded-full border px-2.5 py-0.5 text-[10px] tracking-widest ${
                  event.launched
                    ? 'border-[var(--c-live)]/40 text-[var(--c-live)]'
                    : 'border-[var(--c-bronze)]/40 text-[var(--c-bronze)]'
                }`}
              >
                {event.launched
                  ? CONSOLE_UI.statusLive[locale]
                  : CONSOLE_UI.statusDraft[locale]}
              </span>
              <span className="ms-auto flex gap-6 text-sm tabular-nums text-[var(--c-text-soft)]">
                <span>
                  {counts.confirmed}{' '}
                  <small className="text-[10px] text-[var(--c-text-faint)]">
                    {CONSOLE_UI.colConfirmed[locale]}
                  </small>
                </span>
                <span>
                  {counts.pending}{' '}
                  <small className="text-[10px] text-[var(--c-text-faint)]">
                    {CONSOLE_UI.colPending[locale]}
                  </small>
                </span>
                <span>
                  {counts.waitlisted}{' '}
                  <small className="text-[10px] text-[var(--c-text-faint)]">
                    {CONSOLE_UI.colWaitlist[locale]}
                  </small>
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </ConsoleShell>
  );
};

export default InsightsPage;
