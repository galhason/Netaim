import { getActiveConferenceSlug } from '@/features/events';
import {
  createSession,
  importTemplate,
  readGrid,
  readImport,
} from '@/features/program';
import { authorized, getStudioLocale } from '@/features/studio';

/*
 * The spreadsheet door: hand out the template, read a filled one back,
 * and — only when asked a second time — create what it describes.
 *
 * All three are here rather than in a Server Action for the same reason
 * the media upload is: an action refreshes the route, and this screen
 * holds a file and a preview in the browser's own memory. A fetch
 * leaves them alone.
 *
 * Nothing is created from what the browser sends. The preview step and
 * the commit step both receive the *file* and both parse it from
 * scratch on the server, so a page that has been tampered with can ask
 * for a different file but never for different contents.
 */
export const dynamic = 'force-dynamic';

const MAX_SHEET_BYTES = 5 * 1024 * 1024;

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });

export const GET = async (): Promise<Response> => {
  if (!(await authorized('events:manage'))) {
    return json({ ok: false, reason: 'denied' }, 403);
  }
  const locale = await getStudioLocale();
  const file = importTemplate(locale);
  const name = locale === 'he' ? 'netaim-activities.xlsx' : 'activities.xlsx';

  return new Response(new Uint8Array(file), {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'no-store',
    },
  });
};

export const POST = async (request: Request): Promise<Response> => {
  const locale = await getStudioLocale();
  const slug = await getActiveConferenceSlug(locale).catch(() => null);
  if (!slug || !(await authorized('events:manage', slug))) {
    return json({ ok: false, reason: 'denied' }, 403);
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  const commit = form?.get('commit') === 'yes';

  if (!(file instanceof File) || file.size === 0) {
    return json({ ok: false, reason: 'missing' }, 400);
  }
  if (file.size > MAX_SHEET_BYTES) {
    return json({ ok: false, reason: 'size' }, 413);
  }

  let grid: string[][];
  try {
    grid = readGrid(Buffer.from(await file.arrayBuffer()), file.name);
  } catch {
    return json({ ok: false, reason: 'unreadable' }, 415);
  }

  const reading = readImport(grid);

  if (!commit) {
    return json({
      ok: true,
      missingColumns: reading.missingColumns,
      readyCount: reading.ready.length,
      rows: reading.rows.map((row) => ({
        line: row.line,
        title: row.raw.title ?? '',
        type: row.raw.sessionType ?? '',
        date: row.raw.date ?? '',
        from: row.raw.startTime ?? '',
        to: row.raw.endTime ?? '',
        place: row.raw.floor ?? '',
        capacity: row.raw.capacity ?? '',
        problems: row.problems.map((problem) => problem.message[locale]),
      })),
    });
  }

  if (reading.missingColumns.length > 0) {
    return json({ ok: false, reason: 'columns' }, 400);
  }

  /*
   * Created one at a time and counted, rather than in one transaction:
   * the sessions service is where capacity, the agenda projection and
   * the notices to registered guests all hang off a creation, and a
   * bulk write behind its back would skip every one of them.
   */
  let created = 0;
  const failed: number[] = [];
  for (const row of reading.ready) {
    if (!row.input) {
      continue;
    }
    const saved = await createSession(slug, locale, row.input).catch(() => null);
    if (saved) {
      created += 1;
    } else {
      failed.push(row.line);
    }
  }

  return json({ ok: true, created, failed, skipped: reading.rows.length - reading.ready.length });
};
