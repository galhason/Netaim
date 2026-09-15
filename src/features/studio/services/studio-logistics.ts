import { DIETARY_KEYS } from '@/features/registration/constants/dietary';
import { eventLogisticsSource } from '@/infrastructure';
import type {
  DietaryTally,
  EventLogistics,
  LogisticsRow,
} from '../types/logistics';

/*
 * Logistics: the roster and the numbers a caterer is actually phoned.
 *
 * The counting happens here rather than in the page, and on the
 * normalised key rather than on whatever words the guest chose, because
 * "Vegetarian" and "צמחוני" are one meal. Every preference in the
 * catalogue is reported even at zero — a kitchen reading the list needs
 * to see that nobody asked for gluten-free, not to wonder whether the
 * line is missing — and the people who never answered are their own
 * line rather than folded into "regular".
 */
const tallyOf = (rows: LogisticsRow[]): DietaryTally[] => {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = row.dietaryKey ?? '';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const named: DietaryTally[] = DIETARY_KEYS.map((key) => ({
    key,
    count: counts.get(key) ?? 0,
  }));
  const unknown = counts.get('') ?? 0;
  return unknown > 0 ? [...named, { key: null, count: unknown }] : named;
};

export const getEventLogistics = async (
  slug: string,
): Promise<EventLogistics> => {
  const rows = await eventLogisticsSource(slug).catch(() => []);
  return {
    slug,
    rows,
    tally: tallyOf(rows),
    total: rows.length,
    accessibilityCount: rows.filter((row) => row.accessibility.trim().length > 0)
      .length,
  };
};

/*
 * The same table as a file, for the caterer who works in a spreadsheet.
 *
 * A BOM in front and CRLF between rows: without them Excel opens a
 * Hebrew export as mojibake, which is the only way most people will
 * ever see this file. Quotes are doubled and every field is quoted, so
 * a comma inside an accessibility note cannot shift a column.
 */
const cell = (value: string): string => `"${value.replace(/"/g, '""')}"`;

export const logisticsCsv = (
  logistics: EventLogistics,
  headers: string[],
  dietaryName: (row: LogisticsRow) => string,
): string => {
  const lines = [
    headers.map(cell).join(','),
    ...logistics.rows.map((row) =>
      [
        row.name,
        row.email,
        row.phone,
        dietaryName(row),
        row.organization,
        row.accessibility,
      ]
        .map(cell)
        .join(','),
    ),
  ];
  return `﻿${lines.join('\r\n')}\r\n`;
};
