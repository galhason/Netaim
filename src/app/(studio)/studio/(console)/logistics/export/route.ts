import { DIETARY_LABELS } from '@/features/registration';
import {
  CONSOLE_UI,
  getEventLogistics,
  getStudioLocale,
  logisticsCsv,
  requireCapability,
} from '@/features/studio';
import type { LogisticsRow } from '@/features/studio';

/*
 * The same roster as a file, because the kitchen works in a spreadsheet.
 *
 * The gate is re-derived here and not inherited from the page: a URL is
 * shareable and a route handler is not behind the Studio's layout, so
 * this asks for the capability again before writing a single phone
 * number. `no-store` on the way out — a roster is not something a proxy
 * should keep.
 */
export const dynamic = 'force-dynamic';

export const GET = async (request: Request): Promise<Response> => {
  const access = await requireCapability('registrations:manage');
  if (!access) {
    return new Response('Forbidden', { status: 403 });
  }

  const slug = new URL(request.url).searchParams.get('event')?.trim();
  if (!slug) {
    return new Response('Not found', { status: 404 });
  }

  const locale = await getStudioLocale();
  const logistics = await getEventLogistics(slug);
  const headers = [
    CONSOLE_UI.logisticsColName[locale],
    CONSOLE_UI.logisticsColEmail[locale],
    CONSOLE_UI.logisticsColPhone[locale],
    CONSOLE_UI.logisticsColDietary[locale],
    CONSOLE_UI.logisticsColOrganization[locale],
    CONSOLE_UI.logisticsColAccessibility[locale],
  ];
  const dietaryName = (row: LogisticsRow): string =>
    row.dietaryKey ? DIETARY_LABELS[row.dietaryKey][locale] : row.dietary.trim();

  const csv = logisticsCsv(logistics, headers, dietaryName);
  const filename = `logistics-${slug.replace(/[^a-z0-9-]/gi, '') || 'event'}.csv`;

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
};
