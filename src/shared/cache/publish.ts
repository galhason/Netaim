import { revalidateTag } from 'next/cache';
import { cacheTags } from './content-cache';

/*
 * The single place a write says "this content changed". Studio actions
 * called `revalidatePath('/', 'layout')`, which threw away the cache of
 * every conference on the platform because one of them was edited; and
 * they each had to remember which paths a change touched, which is
 * knowledge a server action should not carry.
 *
 * Here a write names the subject, not the URLs.
 */

/* Anything belonging to one conference: scenes, program, venue, people. */
export const publishedEvent = (slug: string): void => {
  revalidateTag(cacheTags.event(slug));
  /*
   * The landing page IS the active conference, so a change to whichever
   * conference is live must reach it. Revalidating the pointer as well
   * is cheap and removes the need to know whether this is the live one.
   */
  revalidateTag(cacheTags.activeConference);
};

/* The Studio named a different conference the live site. */
export const publishedActiveConference = (): void => {
  revalidateTag(cacheTags.activeConference);
};

/* The Studio changed the site's logo. */
export const publishedSiteBrand = (): void => {
  revalidateTag(cacheTags.siteBrand);
};

/* The composed homepage changed. */
export const publishedHomepage = (): void => {
  revalidateTag(cacheTags.homepage);
};

/*
 * People and sponsors are organization-wide and appear on every
 * conference that lists them, so they clear their own tag rather than
 * one event's.
 */
export const publishedSpeakers = (): void => {
  revalidateTag(cacheTags.speakers);
};

export const publishedSponsors = (): void => {
  revalidateTag(cacheTags.sponsors);
};

/*
 * Someone joined the conference, left it, or changed whether they are
 * listed in its directory. Called on every path that can change who
 * appears — the visibility switch above all, because a person taking
 * themselves out expects to be gone now, not in a minute.
 */
export const publishedDirectory = (slug: string): void => {
  revalidateTag(cacheTags.directory(slug));
};
