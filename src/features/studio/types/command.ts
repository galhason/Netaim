import type { Locale } from '@/config/locales';

/*
 * The command and search foundation (Studio-Workspace-Architecture §5).
 * These contracts are the integration points a future command palette
 * and global search consume; 0.8 ships the registry, the search service
 * and the matcher, and no widget.
 */

export type CommandScope = 'navigate' | 'create' | 'compose' | 'launch';

export interface StudioCommand {
  id: string;
  title: Record<Locale, string>;
  scope: CommandScope;
  keywords: readonly string[];
  href: string;
}

export type StudioSearchKind = 'event' | 'person' | 'venue' | 'media';

export interface StudioSearchResult {
  id: string;
  kind: StudioSearchKind;
  title: string;
  detail?: string;
  href: string;
}

/*
 * The single search language spans every kind (Objective 6). A gateway
 * implementation composes application services only; it owns no storage
 * vocabulary. Venue is part of the language and arrives with its read.
 */
export interface StudioSearchGateway {
  search: (query: string, locale: Locale) => Promise<StudioSearchResult[]>;
}
