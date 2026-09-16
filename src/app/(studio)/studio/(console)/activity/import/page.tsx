import Link from 'next/link';
import { getActiveConferenceSlug } from '@/features/events';
import { COLUMN_LABELS, IMPORT_COLUMNS } from '@/features/program';
import {
  CONSOLE_UI,
  ConsoleShell,
  getStudioCreator,
  getStudioLocale,
  requireCapability,
} from '@/features/studio';
import ImportPanel from './import-panel';

/*
 * Importing a programme.
 *
 * A conference's timetable is argued out in a spreadsheet long before it
 * reaches this platform — and until now the only way in was to retype it
 * one activity at a time through a five-step wizard. This screen takes
 * the spreadsheet.
 *
 * It carries its own capability gate: creating forty activities in one
 * press is the same authority as creating them one by one, and the
 * layout above proves only that a grant exists.
 */
const ImportActivitiesPage = async () => {
  const locale = await getStudioLocale();
  const access = await requireCapability('events:manage');
  const creator = await getStudioCreator();
  const slug = access
    ? await getActiveConferenceSlug(locale).catch(() => null)
    : null;

  const labels = Object.fromEntries(
    IMPORT_COLUMNS.map((column) => [column, COLUMN_LABELS[column][locale]]),
  );

  return (
    <ConsoleShell
      locale={locale}
      userName={creator?.name ?? ''}
      breadcrumb={
        <span className="flex items-center gap-2 text-sm text-[var(--c-text-soft)]">
          <Link
            href="/studio/activity"
            className="transition-colors hover:text-[var(--c-text)]"
          >
            {CONSOLE_UI.dockActivity[locale]}
          </Link>
          <span aria-hidden="true">›</span>
          <span className="font-medium text-[var(--c-text)]">
            {CONSOLE_UI.importTitle[locale]}
          </span>
        </span>
      }
    >
      <div className="mx-auto flex h-full max-w-3xl flex-col gap-5 overflow-y-auto px-6 py-8">
        <header>
          <h1 className="font-display text-3xl font-medium">
            {CONSOLE_UI.importTitle[locale]}
          </h1>
          <p className="mt-1 text-sm text-[var(--c-text-soft)]">
            {CONSOLE_UI.importSub[locale]}
          </p>
        </header>

        {!access ? (
          <p className="text-sm text-[var(--c-text-soft)]">
            {CONSOLE_UI.importDenied[locale]}
          </p>
        ) : !slug ? (
          <p className="text-sm text-[var(--c-text-soft)]">
            {CONSOLE_UI.importNoConference[locale]}
          </p>
        ) : (
          <ImportPanel locale={locale} columnLabels={labels} />
        )}
      </div>
    </ConsoleShell>
  );
};

/*
 * The response depends on who is asking, so it is rendered per request
 * and never prerendered or shared.
 */
export const dynamic = 'force-dynamic';

export default ImportActivitiesPage;
