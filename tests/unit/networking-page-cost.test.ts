import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
 * What one look at the conference community costs, locked.
 *
 * The networking page was measured under load against a database of
 * four hundred participants — the size the conference will actually be.
 * One view issued 121 SQL queries and weighed 380KB, and the server
 * managed three of them a second, because every service on the page
 * resolved the visitor's session for itself and the directory was
 * rebuilt from scratch for each viewer of the same unchanging list.
 *
 * Each case below is one of those findings. None of them is a style
 * preference: each names a specific repetition that a future change
 * could reintroduce without anyone noticing until a room of four
 * hundred people opens the page at once.
 */
const read = (path: string): string => readFileSync(path, 'utf8');

describe('the visitor is identified once, not thirteen times', () => {
  it('memoizes the session for the length of a request', () => {
    const identity = read(
      'src/features/registration/services/participant-identity-service.ts',
    );
    expect(
      /export const currentParticipant = cache\(/.test(identity),
      'every service asks who is here; without `cache` each ask is another trip to the database',
    ).toBe(true);
    expect(identity.includes("from 'react'")).toBe(true);
  });

  it('memoizes the block list the same way', () => {
    /*
     * `myHiddenParticipantIds` and `blockedBetween` are the same rows,
     * and a page drawing a dozen connection tiles asked for them a
     * dozen times.
     */
    const safety = read('src/features/networking/services/safety-service.ts');
    expect(/const relationsOf = cache\(/.test(safety)).toBe(true);
    expect(
      safety.includes('blockRepository\n      .relations(id)'),
      'the repository call belongs inside the memo, not beside it',
    ).toBe(true);
  });

  it('resolves a conference from its slug once per request', () => {
    for (const file of [
      'src/infrastructure/payload/payload-networking-connection.ts',
      'src/infrastructure/payload/payload-networking-meeting.ts',
      'src/infrastructure/payload/payload-registration.ts',
    ]) {
      const text = read(file);
      expect(
        /const eventBySlug = cache\(/.test(text),
        `${file} turns a slug into an event on every operation; it must do so once`,
      ).toBe(true);
    }
  });

  it('walks the visitor’s conferences once per request', () => {
    const account = read('src/features/account/services/account-service.ts');
    expect(/const readHoldings = cache\(/.test(account)).toBe(true);
  });
});

describe('the directory is assembled once, not once per viewer', () => {
  it('is served from the shared content cache, keyed by conference', () => {
    const infra = read('src/infrastructure/index.ts');
    expect(infra.includes('cachedContent(')).toBe(true);
    expect(infra.includes("'directory-participants'")).toBe(true);
    expect(
      infra.includes('cacheTags.directory('),
      'one conference must not discard another conference’s listing',
    ).toBe(true);
  });

  it('holds a listing for seconds, not for an hour', () => {
    /*
     * Everything else in this cache is published content, where a stale
     * minute is cosmetic. This one is a list of people who each hold a
     * switch that takes them out of it, so the ceiling under the tag
     * invalidation is deliberately short.
     */
    const cache = read('src/shared/cache/content-cache.ts');
    const match = /DIRECTORY_MAX_AGE_SECONDS = (\d+)/.exec(cache);
    expect(match, 'the directory needs its own, shorter ceiling').not.toBeNull();
    expect(Number(match?.[1])).toBeLessThanOrEqual(60);
  });

  it('drops the listing the moment someone changes whether they appear', () => {
    /*
     * This is the privacy half of the cache, and the reason the whole
     * thing is defensible: a person who switches themselves off is gone
     * on the next page, not at the end of a window.
     */
    const profile = read('src/app/(frontend)/[locale]/me/profile/actions.ts');
    expect(profile.includes('publishedDirectory(')).toBe(true);
    expect(
      (profile.match(/publishedDirectory\(/g) ?? []).length,
      'both the visibility switch and the details that a tile shows must invalidate',
    ).toBeGreaterThanOrEqual(2);

    const register = read(
      'src/app/(frontend)/[locale]/events/[slug]/register/actions.ts',
    );
    expect(
      register.includes('publishedDirectory(slug)'),
      'a new arrival must appear without waiting for the ceiling',
    ).toBe(true);
  });
});

describe('the page does not repeat itself into the payload', () => {
  it('names the shapes it draws many times', () => {
    /*
     * Every utility string in the markup is paid for twice — once in the
     * HTML and again in the React payload beside it. Naming the handful
     * of shapes the page repeats took 74KB off a single view.
     */
    const css = read('src/styles/globals.css');
    for (const name of [
      '.n-menu-trigger',
      '.n-menu-panel',
      '.n-open-dot',
      '.n-meta-chip',
      '.n-tile',
      '.n-field',
    ]) {
      expect(css.includes(name), `${name} should be defined once, in CSS`).toBe(
        true,
      );
    }
  });

  it('gives a closed menu no box to push the page with', () => {
    /*
     * A browser stops painting the contents of a closed `<details>`, but
     * an absolutely positioned child keeps its layout box — twenty
     * invisible panels wider than their tiles scrolled the whole
     * document sideways on a tablet, with nothing on screen to explain
     * it.
     */
    const css = read('src/styles/globals.css');
    expect(
      /details:not\(\[open\]\) > \.n-menu-panel \{\s*display: none;/.test(css),
    ).toBe(true);
  });

  it('lets the connection huddle wrap instead of hanging off the page', () => {
    const connections = read(
      'src/app/(frontend)/[locale]/me/networking/ui/connections.tsx',
    );
    expect(
      connections.includes('md:flex-wrap'),
      'four tiles do not fit on one line at the width where their scrolling stops',
    ).toBe(true);
  });
});
