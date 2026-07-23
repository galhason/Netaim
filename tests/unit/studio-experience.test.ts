import { describe, expect, it } from 'vitest';
import {
  matchCommands,
  scoreText,
} from '@/features/studio/utils/command-match';
import { buildHomeDigest } from '@/features/studio/utils/home-digest';
import { STUDIO_COMMANDS } from '@/features/studio/constants/commands';
import type { EventHealth } from '@/event-engine';
import type { EventSummary, LaunchReview } from '@/features/events';

const NOW = Date.parse('2026-07-15T00:00:00Z');
const inDays = (days: number): string =>
  new Date(NOW + days * 86400000).toISOString();

const summary = (over: Partial<EventSummary>): EventSummary => ({
  id: over.slug ?? 'id',
  slug: 'event',
  title: 'Event',
  phase: 'planning',
  capabilities: [],
  launched: false,
  ...over,
});

const review = (over: Partial<EventHealth>): LaunchReview => ({
  event: summary({ slug: 'active', title: 'Active Event', startsAt: inDays(10) }),
  canLaunch: true,
  health: {
    phase: 'planning',
    publishStatus: 'draft',
    capabilities: [],
    invalidCapabilities: [],
    findings: [],
    blockers: 0,
    warnings: 0,
    readinessScore: 88,
    translationCompleteness: 100,
    mediaCompleteness: 100,
    requiredActions: [],
    availableTransitions: [],
    ...over,
  },
});

describe('command matching', () => {
  it('ranks exact word over prefix over substring', () => {
    expect(scoreText('New event', 'event')).toBe(3);
    expect(scoreText('Events workspace', 'even')).toBe(2);
    expect(scoreText('Management', 'age')).toBe(1);
    expect(scoreText('Home', 'xyz')).toBe(0);
  });

  it('returns the full registry for an empty query', () => {
    expect(matchCommands(STUDIO_COMMANDS, '   ', 'en')).toHaveLength(
      STUDIO_COMMANDS.length,
    );
  });

  it('finds commands by localized title and keyword', () => {
    const byTitle = matchCommands(STUDIO_COMMANDS, 'events', 'en');
    expect(byTitle[0]?.id).toBe('navigate.events');

    const byHebrew = matchCommands(STUDIO_COMMANDS, 'אירועים', 'he');
    expect(byHebrew.some((command) => command.id === 'navigate.events')).toBe(
      true,
    );
  });
});

describe('home digest', () => {
  it('answers continue and needs-attention from the active event', () => {
    const digest = buildHomeDigest(
      {
        events: [summary({ slug: 'active', startsAt: inDays(10) })],
        activeReview: review({
          requiredActions: [
            {
              id: 'venue',
              severity: 'blocker',
              category: 'venue',
              message: { he: '', en: 'Add a venue' },
              action: { he: '', en: 'Open Venue' },
            },
          ],
          blockers: 1,
        }),
      },
      NOW,
    );

    expect(digest.continue?.eventSlug).toBe('active');
    expect(digest.continue?.readinessScore).toBe(88);
    expect(digest.needsAttention).toHaveLength(1);
  });

  it('lists only future, non-archived events other than the active one', () => {
    const digest = buildHomeDigest(
      {
        events: [
          summary({ slug: 'active', startsAt: inDays(10) }),
          summary({ slug: 'soon', title: 'Soon', startsAt: inDays(3) }),
          summary({ slug: 'past', title: 'Past', startsAt: inDays(-3) }),
          summary({ slug: 'filed', title: 'Filed', phase: 'archived', startsAt: inDays(5) }),
        ],
        activeReview: review({}),
      },
      NOW,
    );

    expect(digest.upcoming.map((event) => event.slug)).toEqual(['soon']);
    expect(digest.upcoming[0]?.daysToEvent).toBe(3);
  });

  it('offers no continue when there is no active review', () => {
    const digest = buildHomeDigest(
      { events: [summary({ startsAt: inDays(5) })], activeReview: null },
      NOW,
    );
    expect(digest.continue).toBeNull();
    expect(digest.needsAttention).toEqual([]);
  });
});
