import { listEvents, listMedia, listPeople } from '@/features/events';
import type { StudioSearchResult } from '../types/command';
import { normalizeQuery, scoreText } from '../utils/command-match';

const MIN_QUERY_LENGTH = 2;
const RESULT_LIMIT = 12;
const KIND_ORDER: Record<StudioSearchResult['kind'], number> = {
  event: 0,
  person: 1,
  venue: 2,
  media: 3,
};

interface ScoredResult {
  score: number;
  result: StudioSearchResult;
}

/*
 * The one search language (Studio-Workspace-Architecture §5). Every kind
 * is ranked by the same pure matcher; each source fails independently so
 * a single missing connection never empties the whole result. Venue is
 * part of the contract and joins when a venue read exists.
 */
export const searchStudio = async (
  query: string,
): Promise<StudioSearchResult[]> => {
  const normalized = normalizeQuery(query);
  if (normalized.length < MIN_QUERY_LENGTH) {
    return [];
  }

  const scored: ScoredResult[] = [];

  try {
    for (const event of await listEvents()) {
      const score = scoreText(`${event.title} ${event.slug}`, normalized);
      if (score > 0) {
        scored.push({
          score,
          result: {
            id: event.id,
            kind: 'event',
            title: event.title,
            href: `/studio/events/${event.slug}`,
          },
        });
      }
    }
  } catch {
    // A missing event connection must not empty people and media results.
  }

  try {
    for (const person of await listPeople()) {
      const score = scoreText(`${person.name} ${person.role ?? ''}`, normalized);
      if (score > 0) {
        scored.push({
          score,
          result: {
            id: person.id,
            kind: 'person',
            title: person.name,
            detail: person.role,
            href: '/studio/library',
          },
        });
      }
    }
  } catch {
    // See above.
  }

  try {
    for (const item of await listMedia()) {
      const score = scoreText(`${item.alt} ${item.filename}`, normalized);
      if (score > 0) {
        scored.push({
          score,
          result: {
            id: item.id,
            kind: 'media',
            title: item.alt,
            detail: item.filename,
            href: '/studio/library',
          },
        });
      }
    }
  } catch {
    // See above.
  }

  return scored
    .sort(
      (a, b) =>
        b.score - a.score ||
        KIND_ORDER[a.result.kind] - KIND_ORDER[b.result.kind],
    )
    .slice(0, RESULT_LIMIT)
    .map((entry) => entry.result);
};
