import { getActiveConferenceSlug } from '@/features/events';
import {
  createSession,
  importTemplate,
  readGrid,
  readImport,
  updateSession,
} from '@/features/program';
import {
  createExternalSpeaker,
  listConferenceSpeakers,
  updateSpeaker,
} from '@/features/speakers';
import { authorized, getStudioLocale } from '@/features/studio';
import type { ImportSpeaker } from '@/features/program';

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
  if (!(await authorized('activities:manage'))) {
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
  if (!slug || !(await authorized('activities:manage', slug))) {
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
        speakers: row.speakers.map((speaker) => speaker.name).join(', '),
        facets: [row.raw.audiences, row.raw.topics, row.raw.language].filter(Boolean).join(' · '),
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
  /*
   * The presenters, by name. A speaker the conference already lists
   * under this name — in either language — is linked, so a sheet
   * uploaded twice, or two activities by one person, never doubles the
   * roster. One not yet listed is created from the row, in Hebrew first
   * and English after, and remembered for the rows that follow.
   */
  const roster = new Map<string, string>();
  const remember = (name: string | undefined, id: string) => {
    if (name) roster.set(name.trim().toLowerCase(), id);
  };
  for (const speaker of await listConferenceSpeakers(slug, 'he').catch(() => [])) {
    remember(speaker.name, speaker.id);
  }
  for (const speaker of await listConferenceSpeakers(slug, 'en', { fallback: false }).catch(() => [])) {
    remember(speaker.name, speaker.id);
  }
  const speakerIdFor = async (speaker: ImportSpeaker): Promise<string | null> => {
    const known = roster.get(speaker.name.toLowerCase()) ?? (speaker.nameEn ? roster.get(speaker.nameEn.toLowerCase()) : undefined);
    if (known) {
      return known;
    }
    const made = await createExternalSpeaker(
      slug,
      {
        name: speaker.name,
        ...(speaker.jobTitle ? { jobTitle: speaker.jobTitle } : {}),
        ...(speaker.company ? { company: speaker.company } : {}),
        ...(speaker.bio ? { bio: speaker.bio } : {}),
      },
      'he',
    ).catch(() => null);
    if (!made) {
      return null;
    }
    const english = {
      ...(speaker.nameEn ? { name: speaker.nameEn } : {}),
      ...(speaker.jobTitleEn ? { jobTitle: speaker.jobTitleEn } : {}),
      ...(speaker.companyEn ? { company: speaker.companyEn } : {}),
      ...(speaker.bioEn ? { bio: speaker.bioEn } : {}),
    };
    if (Object.keys(english).length > 0) {
      await updateSpeaker(made.id, english, 'en').catch(() => null);
    }
    remember(speaker.name, made.id);
    remember(speaker.nameEn, made.id);
    return made.id;
  };

  let created = 0;
  const failed: number[] = [];
  for (const row of reading.ready) {
    if (!row.input) {
      continue;
    }
    const speakerIds: string[] = [];
    for (const speaker of row.speakers) {
      const id = await speakerIdFor(speaker);
      if (id) speakerIds.push(id);
    }
    /*
     * Hebrew is the activity; English is what was translated of it.
     * Written as a second pass so an untranslated column stays absent
     * rather than becoming an empty English string — empty is what lets
     * the English page fall back to the Hebrew.
     */
    const saved = await createSession(slug, 'he', { ...row.input, speakerIds }).catch(() => null);
    if (!saved) {
      failed.push(row.line);
      continue;
    }
    created += 1;
    if (row.english) {
      await updateSession(saved.id, 'en', row.english).catch(() => null);
    }
  }

  return json({ ok: true, created, failed, skipped: reading.rows.length - reading.ready.length });
};
