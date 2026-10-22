import type { NextRequest } from 'next/server';
import { audit, exportAudit } from '@/features/access';
import { requireCapability } from '@/features/studio';
import { csvField } from '@/shared/utils/csv';

/*
 * The log, as a file. CSV for a spreadsheet, JSON for anything else;
 * the same filters as the screen. Only the Netaim Admin may pull it,
 * and pulling it is itself written to the log — an export is an act.
 */
export const dynamic = 'force-dynamic';

/* Every field quoted, and none read as a formula (see csvField). */
const csvCell = csvField;

export const GET = async (request: NextRequest): Promise<Response> => {
  const access = await requireCapability('audit:read');
  if (!access) {
    return new Response('Forbidden', { status: 403 });
  }
  const params = request.nextUrl.searchParams;
  const format = params.get('format') === 'json' ? 'json' : 'csv';
  const from = params.get('from');
  const to = params.get('to');
  const query = {
    ...(params.get('event') ? { subject: params.get('event')! } : {}),
    ...(params.get('actor') ? { actorEmail: params.get('actor')! } : {}),
    ...(params.get('action') ? { action: params.get('action')! } : {}),
    ...(from ? { from: new Date(from).toISOString() } : {}),
    ...(to ? { to: new Date(`${to}T23:59:59.999`).toISOString() } : {}),
  };
  const entries = await exportAudit(query);
  await audit(access.creator, 'audit.exported', undefined, { format, entries: entries.length, ...query });

  const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
  if (format === 'json') {
    return new Response(JSON.stringify({ exportedAt: new Date().toISOString(), filters: query, entries }, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="netaim-audit-${stamp}.json"`,
        'Cache-Control': 'no-store',
      },
    });
  }
  const header = ['at', 'actorName', 'actorEmail', 'action', 'subject', 'subjectLabel', 'detail'];
  const lines = [
    header.join(','),
    ...entries.map((entry) =>
      [entry.at, entry.actorName, entry.actorEmail, entry.action, entry.subject, entry.subjectLabel, entry.detail]
        .map(csvCell)
        .join(','),
    ),
  ];
  /* A byte-order mark, so Excel opens the Hebrew as Hebrew. */
  return new Response(`﻿${lines.join('\r\n')}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="netaim-audit-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
};
