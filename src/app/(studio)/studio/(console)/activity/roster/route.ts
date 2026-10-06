import { audit } from '@/features/access';
import { getActiveConferenceSlug } from '@/features/events';
import { writeWorkbook } from '@/features/program';
import {
  activityRosterSheets,
  CONSOLE_UI,
  getActivityRosters,
  getStudioLocale,
  requireCapability,
  rosterSize,
} from '@/features/studio';

/*
 * Who signed up for the activities, as an Excel file: one activity when
 * `?session=` names it, every activity of the active conference in one
 * workbook otherwise.
 *
 * The gate is asked again here rather than inherited from the page — a
 * URL can be shared and a route handler sits outside the Studio's
 * layout. The file is a list of names, phone numbers and addresses, so
 * it is for the people who may see participants (Admin and Supervisor),
 * it is never cached on the way out, and each download is written to
 * the conference's history with who took it and how many people it held.
 */
export const dynamic = 'force-dynamic';

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/* An id is digits; anything else is not an activity of ours. */
const SESSION_ID = /^\d{1,12}$/;

const attachment = (ascii: string, readable: string): string =>
  `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(readable)}`;

const readableName = (text: string): string =>
  text.replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);

export const GET = async (request: Request): Promise<Response> => {
  const locale = await getStudioLocale();
  const slug = await getActiveConferenceSlug(locale).catch(() => null);
  const access = slug ? await requireCapability('participants:read', slug) : null;
  if (!slug || !access) {
    return new Response('Forbidden', { status: 403, headers: { 'Cache-Control': 'no-store' } });
  }

  const asked = new URL(request.url).searchParams.get('session')?.trim() ?? '';
  if (asked && !SESSION_ID.test(asked)) {
    return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }
  const scope = asked ? 'one' : 'all';

  const rosters = await getActivityRosters(slug, locale, asked || undefined).catch(() => null);
  if (!rosters) {
    return new Response('Unavailable', { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  if (scope === 'one' && rosters.activities.length === 0) {
    return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }

  const file = writeWorkbook(activityRosterSheets(rosters, locale, scope));
  const safeSlug = slug.replace(/[^a-z0-9-]/gi, '') || 'conference';
  const title = rosters.activities[0]?.title ?? '';
  const ascii = scope === 'one' ? `registrants-${safeSlug}-${asked}.xlsx` : `registrants-${safeSlug}-all.xlsx`;
  const readable =
    scope === 'one'
      ? `${readableName(CONSOLE_UI.rosterFileOne[locale].replace('{title}', title)) || ascii.replace(/\.xlsx$/, '')}.xlsx`
      : `${CONSOLE_UI.rosterFileAll[locale]}.xlsx`;

  await audit(
    access.creator,
    'registration.rosterExported',
    slug,
    {
      scope,
      activities: rosters.activities.length,
      people: rosterSize(rosters),
      ...(scope === 'one' ? { session: asked } : {}),
    },
    scope === 'one' ? title : undefined,
  );

  return new Response(new Uint8Array(file), {
    headers: {
      'Content-Type': XLSX,
      'Content-Disposition': attachment(ascii, readable),
      'Cache-Control': 'no-store',
    },
  });
};
