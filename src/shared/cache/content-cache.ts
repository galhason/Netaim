import { unstable_cache } from 'next/cache';

/*
 * Published content is identical for every visitor, yet each public page
 * is rendered per request — because the guest's own session decides the
 * announcements and the sign-in state on it. Those two facts are not in
 * conflict: the page stays dynamic, and the expensive part, assembling a
 * conference out of the CMS, is served from a shared cache.
 *
 * Nothing here may read cookies or headers. A cached function that did
 * would serve one visitor's view to the next.
 */

/*
 * Tags name what a cached entry is about, so publishing one conference
 * does not discard the cache of every other. `revalidatePath('/', 'layout')`
 * — which the Studio called on most writes — did exactly that.
 */
export const cacheTags = {
  /* Everything derived from one conference. */
  event: (slug: string): string => `event:${slug}`,
  /* The conference the Studio has named the live site. */
  activeConference: 'site:active-conference',
  /* The logo the Studio holds — drawn in the chrome of every page. */
  siteBrand: 'site:brand',
  /* The composed homepage. */
  homepage: 'site:homepage',
  /* A named scene sequence rendered at /experiences/[slug]. */
  experience: (slug: string): string => `experience:${slug}`,
  /* Organization-wide people and sponsor lists. */
  speakers: 'org:speakers',
  sponsors: 'org:sponsors',
  /*
   * Who appears in one conference's participant directory.
   *
   * Unlike the tags above this one names people rather than published
   * content, so it is invalidated the moment someone changes whether
   * they are listed — and its entry is also given a short life of its
   * own, so that even a path that forgets to invalidate cannot keep
   * showing someone who has just taken themselves out.
   */
  directory: (slug: string): string => `directory:${slug}`,
} as const;

/*
 * How long a directory listing may live without being told to go.
 *
 * Short on purpose. Everything else cached here is published content,
 * where a stale minute is a cosmetic problem; this one is a list of
 * people who each hold a switch that removes them from it. Tag
 * invalidation is the mechanism and it is immediate — this is the
 * ceiling on how long a missed invalidation could possibly last.
 */
export const DIRECTORY_MAX_AGE_SECONDS = 30;

/*
 * A conservative ceiling. Invalidation is by tag and immediate, so this
 * only bounds how long a missed invalidation could persist — it is a
 * safety net, not the mechanism.
 */
const MAX_AGE_SECONDS = 60 * 60;

/*
 * Wraps a data function so identical arguments share one result across
 * visitors until a tag is revalidated.
 *
 * `keyParts` must capture every argument that changes the result —
 * locale above all. A cached reader that forgets the locale serves
 * Hebrew to an English visitor.
 */
export const cachedContent = <TArgs extends readonly unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  keyParts: readonly string[],
  tags: readonly string[],
  revalidateSeconds: number = MAX_AGE_SECONDS,
): ((...args: TArgs) => Promise<TResult>) =>
  unstable_cache(fn, [...keyParts], {
    tags: [...tags],
    revalidate: revalidateSeconds,
  });
