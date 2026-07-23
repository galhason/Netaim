import type { Locale } from '@/config/locales';
import type { StudioCommand } from '../types/command';

/*
 * Pure matching shared by the command registry and global search. No
 * infrastructure, no React — the ranking rule is unit-testable in
 * isolation. Exact word beats prefix beats substring; the best-scoring
 * word in a text wins.
 */

const EXACT = 3;
const PREFIX = 2;
const SUBSTRING = 1;

export const normalizeQuery = (query: string): string =>
  query.trim().toLowerCase();

export const scoreText = (text: string, normalizedQuery: string): number => {
  if (!normalizedQuery) {
    return 0;
  }
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  let best = 0;
  for (const word of words) {
    if (word === normalizedQuery) {
      return EXACT;
    }
    if (word.startsWith(normalizedQuery)) {
      best = Math.max(best, PREFIX);
    } else if (word.includes(normalizedQuery)) {
      best = Math.max(best, SUBSTRING);
    }
  }
  return best;
};

export const scoreCommand = (
  command: StudioCommand,
  normalizedQuery: string,
  locale: Locale,
): number => {
  const haystack = [command.title[locale], ...command.keywords].join(' ');
  return scoreText(haystack, normalizedQuery);
};

export const matchCommands = (
  commands: readonly StudioCommand[],
  query: string,
  locale: Locale,
): StudioCommand[] => {
  const normalized = normalizeQuery(query);
  if (!normalized) {
    return [...commands];
  }
  return commands
    .map((command) => ({
      command,
      score: scoreCommand(command, normalized, locale),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.command);
};
