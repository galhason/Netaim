import Link from 'next/link';
import { findEvent, listEvents } from '@/features/events';
import {
  getRegistrationCounts,
  getRegistrationSettings,
  getRegistrationSituation,
  listRegistrations,
  PUBLIC_STATE_LABELS,
  REGISTRATION_MESSAGES,
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
import {
  approveRegistrationAction,
  declineRegistrationAction,
  promoteRegistrationAction,
  saveRegistrationSettingsAction,
} from '../../actions';

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
const quietButton =
  'rounded-lg border border-[var(--c-line-strong)] px-3 py-1 text-[11px] text-[var(--c-text-soft)] transition-colors hover:border-[var(--c-bronze)]/50 hover:text-[var(--c-bronze)]';
const primaryButton =
  'rounded-lg bg-[var(--c-bronze)] px-3 py-1 text-[11px] font-medium text-[#161006] transition-colors hover:bg-[#dcbe84]';
const settingsField =
  'w-full rounded-lg border border-[var(--c-line)] bg-[var(--c-panel)] px-3 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-bronze)]/60';
const settingsLabel =
  'mb-1.5 block text-[10px] font-medium tracking-[0.16em] text-[var(--c-text-faint)]';

const dateValue = (iso?: string): string => (iso ? iso.slice(0, 10) : '');

const InsightsPage = async ({ searchParams }: InsightsPageProps) => {
  const { event: eventParam } = await searchParams;
  const locale = await getStudioLocale();
  const creator = await getStudioCreator();

  if (eventParam) {
    /*
     * Moderation lives with the queue it moderates. Approving, declining
     * and promoting were reachable only from the classic Studio, so an
     * approval-mode conference could not be run from the Console at all —
     * it could see who was waiting and do nothing about it.
     */
    const [event, registrations, settings, situation] = await Promise.all([
      findEvent(eventParam).catch(() => null),
      listRegistrations(eventParam).catch(() => []),
      getRegistrationSettings(eventParam, locale).catch(() => null),
      getRegistrationSituation(eventParam, locale).catch(() => null),
    ]);
    const m = REGISTRATION_MESSAGES;
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

          <div className="rounded-xl border border-[var(--c-line)] bg-[var(--c-glass)] px-6 py-5">
            {situation ? (
              <p className="mb-3 text-xs text-[var(--c-text-soft)]">
                {PUBLIC_STATE_LABELS[situation.state][locale]}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-8">
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
              {/*
                `capacity.reserved` is deliberately not shown: it counts
                the same people as `pending` — places held while approval
                is decided — and two columns of one number reads as two
                different facts.
              */}
              {situation ? (
                <div>
                  <p className="font-display text-2xl">
                    {situation.capacity.available ?? '—'}
                  </p>
                  <p className="text-[10px] tracking-[0.14em] text-[var(--c-text-faint)]">
                    {situation.capacity.limit === null
                      ? m.capacity.unlimited[locale]
                      : m.capacity.available[locale]}
                  </p>
                </div>
              ) : null}
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
                    {registration.status === 'pending' ? (
                      <>
                        <form action={approveRegistrationAction} className="flex-none">
                          <input type="hidden" name="slug" value={event?.slug ?? eventParam} />
                          <input type="hidden" name="registrationId" value={registration.id} />
                          <button type="submit" className={primaryButton}>
                            {m.studio.approve[locale]}
                          </button>
                        </form>
                        <form action={declineRegistrationAction} className="flex-none">
                          <input type="hidden" name="slug" value={event?.slug ?? eventParam} />
                          <input type="hidden" name="registrationId" value={registration.id} />
                          <button type="submit" className={quietButton}>
                            {m.studio.decline[locale]}
                          </button>
                        </form>
                      </>
                    ) : null}
                    {registration.status === 'waitlisted' ? (
                      <form action={promoteRegistrationAction} className="flex-none">
                        <input type="hidden" name="slug" value={event?.slug ?? eventParam} />
                        <input type="hidden" name="registrationId" value={registration.id} />
                        <button type="submit" className={primaryButton}>
                          {m.studio.promote[locale]}
                        </button>
                      </form>
                    ) : null}
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

          {/*
            The rules that decide who gets in. Open by default when the
            conference collects nothing yet, because that is the one case
            where the organizer certainly has something to do here.
          */}
          <details
            open={!settings}
            className="rounded-xl border border-[var(--c-line)] bg-[var(--c-glass)]"
          >
            <summary className="cursor-pointer list-none px-5 py-3 text-xs font-medium tracking-[0.12em] text-[var(--c-text-soft)] transition-colors hover:text-[var(--c-bronze)]">
              {m.studio.adjust[locale]}
            </summary>
            <form
              action={saveRegistrationSettingsAction}
              className="flex flex-col gap-4 border-t border-[var(--c-line)] p-5"
            >
              <input type="hidden" name="slug" value={event?.slug ?? eventParam} />
              <input type="hidden" name="contentLocale" value={locale} />

              {!settings ? (
                <p className="text-xs text-[var(--c-text-faint)]">
                  {m.studio.notConfigured[locale]}
                </p>
              ) : null}

              <label className="block">
                <span className={settingsLabel}>
                  {m.studio.whoCanAttend[locale]}
                </span>
                <select
                  name="mode"
                  defaultValue={settings?.mode ?? 'open'}
                  className={settingsField}
                >
                  <option value="open">{m.studio.modeOpen[locale]}</option>
                  <option value="approval">{m.studio.modeApproval[locale]}</option>
                  <option value="invitation">
                    {m.studio.modeInvitation[locale]}
                  </option>
                </select>
              </label>

              <label className="block">
                <span className={settingsLabel}>
                  {m.studio.howManyPlaces[locale]}
                </span>
                <input
                  type="number"
                  name="capacity"
                  min={1}
                  defaultValue={settings?.capacity ?? undefined}
                  placeholder={m.studio.placesHint[locale]}
                  className={settingsField}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className={settingsLabel}>
                    {m.studio.opensWhen[locale]}
                  </span>
                  <input
                    type="date"
                    name="opensAt"
                    defaultValue={dateValue(settings?.opensAt)}
                    className={settingsField}
                  />
                </label>
                <label className="block">
                  <span className={settingsLabel}>
                    {m.studio.closesWhen[locale]}
                  </span>
                  <input
                    type="date"
                    name="closesAt"
                    defaultValue={dateValue(settings?.closesAt)}
                    className={settingsField}
                  />
                </label>
              </div>

              <label className="block">
                <span className={settingsLabel}>
                  {m.studio.confirmationMessage[locale]}
                </span>
                <textarea
                  name="confirmationMessage"
                  rows={3}
                  defaultValue={settings?.confirmationMessage ?? ''}
                  className={`${settingsField} resize-none`}
                />
              </label>

              <fieldset className="flex flex-col gap-2.5 text-xs text-[var(--c-text-soft)]">
                <label className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    name="waitlistEnabled"
                    defaultChecked={settings?.waitlistEnabled ?? false}
                    className="size-3.5"
                  />
                  {m.studio.waitingList[locale]}
                </label>
                <label className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    name="collectPhone"
                    defaultChecked={settings?.collectPhone ?? false}
                    className="size-3.5"
                  />
                  {m.studio.collectPhone[locale]}
                </label>
                <label className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    name="collectAccessibility"
                    defaultChecked={settings?.collectAccessibility ?? false}
                    className="size-3.5"
                  />
                  {m.studio.collectAccessibility[locale]}
                </label>
                <label className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    name="collectDietary"
                    defaultChecked={settings?.collectDietary ?? false}
                    className="size-3.5"
                  />
                  {m.studio.collectDietary[locale]}
                </label>
              </fieldset>

              <button type="submit" className={`${primaryButton} self-start`}>
                {m.studio.save[locale]}
              </button>
            </form>
          </details>
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

/*
 * The response depends on who is asking, so it is rendered per request
 * and never prerendered or shared. Declared rather than left to Next to
 * infer from a cookie read: an inferred guard disappears the moment a
 * refactor moves that read behind a helper, and the failure would be a
 * privacy leak that nothing announces.
 */
export const dynamic = 'force-dynamic';

export default InsightsPage;
