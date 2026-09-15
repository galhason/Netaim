import { listEvents } from '@/features/events';
import { DIETARY_LABELS } from '@/features/registration';
import {
  CONSOLE_UI,
  ConsoleShell,
  getEventLogistics,
  getStudioLocale,
  requireCapability,
} from '@/features/studio';
import type { LogisticsRow } from '@/features/studio';
import { countOpenReports } from '@/features/networking';
import type { Locale } from '@/config/locales';

/*
 * Logistics: the one screen the conference is run from on the day.
 *
 * Everything here already existed somewhere — a phone number on an
 * account, a meal preference chosen during registration — and that is
 * precisely the problem it solves: a caterer needs one number per meal
 * and a front desk needs one list, and neither of them is going to open
 * four hundred profiles. So the page is a table and a row of totals,
 * and deliberately nothing else. It edits nothing.
 *
 * It carries its own capability gate rather than leaning on the Studio
 * layout: the layout proves a grant exists, this page shows every
 * guest's telephone number, and those are not the same question.
 */
interface LogisticsPageProps {
  searchParams: Promise<{ event?: string }>;
}

const th =
  'whitespace-nowrap px-3 py-2 text-start text-[10px] font-semibold tracking-[0.18em] text-[var(--c-text-faint)]';
const td = 'px-3 py-2.5 align-top text-sm text-[var(--c-text)]';

const selectField =
  'rounded-lg border border-[var(--c-line-strong)] bg-[rgba(6,10,16,0.6)] px-3 py-1.5 text-xs text-[var(--c-text)] focus:border-[var(--c-bronze)]/60 focus:outline-none';

const quietButton =
  'rounded-lg border border-[var(--c-line-strong)] px-3 py-1.5 text-[11px] text-[var(--c-text-soft)] transition-colors hover:border-[var(--c-bronze)]/50 hover:text-[var(--c-bronze)]';

/*
 * What to print in the food column. The stored words are the guest's
 * own, in the language they registered in; an operator reading the
 * Studio in Hebrew should not meet "Kosher mehadrin" in one row and
 * "כשרות מהודרת" in the next, so a recognised preference is shown in
 * the operator's language and anything else exactly as it was written.
 */
const dietaryText = (row: LogisticsRow, locale: Locale): string =>
  row.dietaryKey ? DIETARY_LABELS[row.dietaryKey][locale] : row.dietary.trim();

const Denied = async ({ locale }: { locale: Locale }) => (
  <ConsoleShell
    locale={locale}
    userName=""
    breadcrumb={
      <span className="font-medium text-[var(--c-text)]">
        {CONSOLE_UI.logisticsTitle[locale]}
      </span>
    }
  >
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm text-[var(--c-text-soft)]">
        {CONSOLE_UI.logisticsDenied[locale]}
      </p>
    </div>
  </ConsoleShell>
);

const LogisticsPage = async ({ searchParams }: LogisticsPageProps) => {
  const locale = await getStudioLocale();
  const access = await requireCapability('registrations:manage');
  if (!access) {
    return <Denied locale={locale} />;
  }

  const { event: requested } = await searchParams;
  const [events, openReports] = await Promise.all([
    listEvents().catch(() => []),
    countOpenReports().catch(() => 0),
  ]);

  const chosen =
    events.find((event) => event.slug === requested) ??
    events.find((event) => event.launched) ??
    events[0];

  const logistics = chosen
    ? await getEventLogistics(chosen.slug)
    : { slug: '', rows: [], tally: [], total: 0, accessibilityCount: 0 };

  return (
    <ConsoleShell
      locale={locale}
      userName={access.creator.name}
      openReports={openReports}
      breadcrumb={
        <span className="font-medium text-[var(--c-text)]">
          {CONSOLE_UI.logisticsTitle[locale]}
        </span>
      }
    >
      <div className="mx-auto flex h-full max-w-5xl flex-col gap-6 overflow-y-auto px-6 py-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-medium">
              {CONSOLE_UI.logisticsTitle[locale]}
            </h1>
            <p className="mt-1 text-sm text-[var(--c-text-soft)]">
              {CONSOLE_UI.logisticsSub[locale]}
            </p>
          </div>
          {events.length > 1 ? (
            <form method="get" className="flex items-center gap-2">
              <label
                htmlFor="logistics-event"
                className="text-[10px] tracking-[0.18em] text-[var(--c-text-faint)]"
              >
                {CONSOLE_UI.logisticsChooseEvent[locale].toUpperCase()}
              </label>
              <select
                id="logistics-event"
                name="event"
                defaultValue={chosen?.slug ?? ''}
                className={selectField}
              >
                {events.map((event) => (
                  <option key={event.slug} value={event.slug}>
                    {event.title}
                  </option>
                ))}
              </select>
              <button type="submit" className={quietButton}>
                {CONSOLE_UI.logisticsShow[locale]}
              </button>
            </form>
          ) : null}
        </header>

        {!chosen ? (
          <p className="text-sm text-[var(--c-text-soft)]">
            {CONSOLE_UI.logisticsNoEvents[locale]}
          </p>
        ) : (
          <>
            {/* The kitchen's numbers, before the list they came from. */}
            <section className="rounded-xl border border-[var(--c-line)] bg-[var(--c-panel)] px-5 py-4">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-display text-3xl tabular-nums text-[var(--c-bronze)]">
                  {logistics.total}
                </span>
                <span className="text-sm text-[var(--c-text-soft)]">
                  {CONSOLE_UI.logisticsTotal[locale]} · {chosen.title}
                </span>
                {logistics.accessibilityCount > 0 ? (
                  <span className="ms-auto text-xs text-[var(--c-text-faint)]">
                    {logistics.accessibilityCount}{' '}
                    {CONSOLE_UI.logisticsAccessibilityCount[locale]}
                  </span>
                ) : null}
              </div>

              <p className="mt-4 text-[10px] tracking-[0.18em] text-[var(--c-text-faint)]">
                {CONSOLE_UI.logisticsMeals[locale].toUpperCase()}
              </p>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {logistics.tally.map((line) => (
                  <li
                    key={line.key ?? 'unspecified'}
                    className={`flex items-baseline gap-2 rounded-lg border px-3 py-2 ${
                      line.count > 0
                        ? 'border-[var(--c-line-strong)]'
                        : 'border-[var(--c-line)] opacity-55'
                    }`}
                  >
                    <span className="font-display text-xl tabular-nums text-[var(--c-text)]">
                      {line.count}
                    </span>
                    <span className="text-xs text-[var(--c-text-soft)]">
                      {line.key
                        ? DIETARY_LABELS[line.key][locale]
                        : CONSOLE_UI.logisticsUnspecified[locale]}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {logistics.rows.length === 0 ? (
              <p className="text-sm text-[var(--c-text-soft)]">
                {CONSOLE_UI.logisticsEmpty[locale]}
              </p>
            ) : (
              <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-[var(--c-text-faint)]">
                    {logistics.total}{' '}
                    {logistics.total === 1
                      ? CONSOLE_UI.logisticsPerson[locale]
                      : CONSOLE_UI.logisticsPeople[locale]}
                  </p>
                  <a
                    href={`/studio/logistics/export?event=${encodeURIComponent(chosen.slug)}`}
                    className={quietButton}
                  >
                    {CONSOLE_UI.logisticsExport[locale]}
                  </a>
                </div>

                {/*
                  * A table needs width. On a phone the same six facts
                  * are a stack of cards rather than a row that has to be
                  * dragged sideways to read a telephone number — which
                  * is the one thing anyone opens this on a phone for.
                  */}
                <ul className="flex flex-col gap-2 sm:hidden">
                  {logistics.rows.map((row) => (
                    <li
                      key={row.participantId}
                      className="rounded-xl border border-[var(--c-line)] bg-[var(--c-panel)] px-4 py-3"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-medium">{row.name || '—'}</span>
                        <span className="text-[10px] tracking-[0.14em] text-[var(--c-text-faint)]">
                          {row.registrationStatus
                            ? CONSOLE_UI.logisticsViaForm[locale]
                            : CONSOLE_UI.logisticsViaActivities[locale]}
                        </span>
                      </div>
                      {row.organization ? (
                        <p className="text-xs text-[var(--c-text-faint)]">
                          {row.organization}
                        </p>
                      ) : null}
                      <p className="mt-1 break-all text-xs text-[var(--c-text-soft)]" dir="ltr">
                        {row.email || '—'}
                      </p>
                      {row.phone ? (
                        <p className="text-xs text-[var(--c-text-soft)]" dir="ltr">
                          {row.phone}
                        </p>
                      ) : null}
                      <p className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full border border-[var(--c-line-strong)] px-2.5 py-0.5 text-[var(--c-text)]">
                          {dietaryText(row, locale) ||
                            CONSOLE_UI.logisticsUnspecified[locale]}
                        </span>
                        {row.accessibility ? (
                          <span className="text-[var(--c-text-soft)]">
                            {CONSOLE_UI.logisticsAccessibility[locale]}:{' '}
                            {row.accessibility}
                          </span>
                        ) : null}
                      </p>
                    </li>
                  ))}
                </ul>

                <div className="hidden overflow-x-auto rounded-xl border border-[var(--c-line)] bg-[var(--c-panel)] sm:block">
                  <table className="w-full min-w-[720px] border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--c-line)]">
                        <th className={th}>
                          {CONSOLE_UI.logisticsColName[locale].toUpperCase()}
                        </th>
                        <th className={th}>
                          {CONSOLE_UI.logisticsColEmail[locale].toUpperCase()}
                        </th>
                        <th className={th}>
                          {CONSOLE_UI.logisticsColPhone[locale].toUpperCase()}
                        </th>
                        <th className={th}>
                          {CONSOLE_UI.logisticsColDietary[locale].toUpperCase()}
                        </th>
                        <th className={th}>
                          {CONSOLE_UI.logisticsColAccessibility[
                            locale
                          ].toUpperCase()}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {logistics.rows.map((row) => (
                        <tr
                          key={row.participantId}
                          className="border-b border-[var(--c-line)] last:border-0"
                        >
                          <td className={td}>
                            <span className="block font-medium">
                              {row.name || '—'}
                            </span>
                            {row.organization ? (
                              <span className="block text-xs text-[var(--c-text-faint)]">
                                {row.organization}
                              </span>
                            ) : null}
                            <span className="mt-0.5 block text-[10px] tracking-[0.14em] text-[var(--c-text-faint)]">
                              {row.registrationStatus
                                ? CONSOLE_UI.logisticsViaForm[locale]
                                : CONSOLE_UI.logisticsViaActivities[locale]}
                            </span>
                          </td>
                          <td className={`${td} break-all`} dir="ltr">
                            {row.email || '—'}
                          </td>
                          <td className={`${td} whitespace-nowrap`} dir="ltr">
                            {row.phone || '—'}
                          </td>
                          <td className={td}>
                            {dietaryText(row, locale) || (
                              <span className="text-[var(--c-text-faint)]">—</span>
                            )}
                          </td>
                          <td className={`${td} text-xs text-[var(--c-text-soft)]`}>
                            {row.accessibility || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
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

export default LogisticsPage;
