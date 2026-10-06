import { cache } from 'react';
import { brandFor } from '@/config/brand';
import type { Locale } from '@/config/locales';
import { withBasePath } from '@/config/site';
import { staffRoleOf } from '@/features/access';
import { getActiveConferenceSlug, getSiteBrand, getStaffOnlyConferenceSlug } from '@/features/events';
import { currentParticipant } from '@/features/registration';

/*
 * The door of a conference that is open to the Netaim team only.
 *
 * The Studio can publish a conference and keep it to the team while it
 * is checked: a signed-in team member (Admin, Supervisor, Staff,
 * Developer — the people the Studio is offered to) sees every page as
 * it will be, and everyone else — a visitor, or a signed-in guest — sees
 * "the conference is being prepared" and nothing of the conference
 * itself, not even its name.
 *
 * Asked by every page, layout, action and API route that serves a
 * conference, not by one layout above them: a layout that leaves its
 * children out still has them rendered and sent, so the door has to be
 * at each one. Resolved once per request (React's cache), and only
 * when the conference is actually closed — an open conference costs
 * one cached read and no look at the visitor at all.
 *
 * Server-only, and outside the feature's barrel: it reads the session
 * cookie, and the barrel is imported by client components.
 */
export type DoorViewer = 'staff' | 'member' | 'guest';

export type ConferenceDoor =
  | { staffOnly: false; open: true }
  | { staffOnly: true; open: boolean; viewer: DoorViewer };

/* Who is looking, as the door sees them. */
export const doorViewer = cache(async (): Promise<DoorViewer> => {
  const me = await currentParticipant().catch(() => null);
  if (!me) {
    return 'guest';
  }
  const role = await staffRoleOf(me.id).catch(() => null);
  return role ? 'staff' : 'member';
});

export const conferenceDoor = cache(async (slug: string): Promise<ConferenceDoor> => {
  const closed = await getStaffOnlyConferenceSlug();
  if (!slug || closed !== slug) {
    return { staffOnly: false, open: true };
  }
  const viewer = await doorViewer();
  return { staffOnly: true, open: viewer === 'staff', viewer };
});

export const mayEnterConference = async (slug: string): Promise<boolean> =>
  (await conferenceDoor(slug)).open;

/*
 * The site's conference as this visitor may see it: the live-site
 * conference, or null while it is closed to them. For the pages that
 * are not a conference's own but lead to one — the account, the bell,
 * the bar, the announcements.
 */
export const visibleSiteConference = async (locale: Locale): Promise<string | null> => {
  const slug = await getActiveConferenceSlug(locale).catch(() => null);
  if (!slug) {
    return null;
  }
  return (await mayEnterConference(slug)) ? slug : null;
};

/*
 * Where "Sign in" on the closed page leads: the sign-in screen, which
 * brings the person back to the page they asked for. The return path is
 * the browser's own, base path included.
 */
export const signInBackTo = (locale: Locale, path: string): string =>
  `/${locale}/me?next=${encodeURIComponent(withBasePath(path))}`;

/*
 * The first thing every page of a conference asks: is this visitor
 * allowed in? Null when they are — the page carries on as it always
 * did — and otherwise what the "being prepared" page needs, which the
 * page draws in place of itself, so nothing of the conference is read
 * into the response.
 */
export interface ClosedConference {
  locale: Locale;
  viewer: 'guest' | 'member';
  signInHref: string;
  brand: string;
  brandLogo: string;
}

const closedFor = async (
  slug: string,
  locale: Locale,
  returnTo: string,
): Promise<ClosedConference | null> => {
  const door = await conferenceDoor(slug);
  if (door.open) {
    return null;
  }
  const logo = await getSiteBrand();
  return {
    locale,
    viewer: door.viewer === 'member' ? 'member' : 'guest',
    signInHref: signInBackTo(locale, returnTo),
    brand: brandFor(locale),
    brandLogo: logo.onLight,
  };
};

/*
 * A page of the conference itself. `path` is the page's own address
 * under the conference (`/agenda`, `/speakers/12`, '' for the
 * conference): signing in returns there.
 */
export const closedConferencePage = (
  slug: string,
  locale: Locale,
  path: string,
): Promise<ClosedConference | null> =>
  closedFor(slug, locale, `/${locale}/events/${slug}${path}`);

/* The site's front door, which plays the live-site conference. */
export const closedSitePage = (slug: string, locale: Locale): Promise<ClosedConference | null> =>
  closedFor(slug, locale, `/${locale}`);

/*
 * The marketing site, asking on behalf of one of its visitors.
 *
 * WordPress builds the conference pages on its server, from the
 * marketing API, and caches them for everyone. For a conference kept to
 * the team it asks a second time with `audience=team`, forwarding only
 * the visitor's platform session cookie; the answer includes the closed
 * conference when — and only when — that session belongs to the team.
 * Any other caller is the public, whatever it asks for.
 */
export type MarketingAudience = 'team' | 'public';

export const marketingAudience = async (asked: string | null): Promise<MarketingAudience> =>
  asked === 'team' && (await doorViewer()) === 'staff' ? 'team' : 'public';

/* Whether the marketing API may answer for this conference, to this audience. */
export const marketingMayShow = async (slug: string, audience: MarketingAudience): Promise<boolean> =>
  audience === 'team' || (await getStaffOnlyConferenceSlug()) !== slug;

/* A team answer is one person's, and must never be kept by anyone on the way. */
export const marketingCacheControl = (audience: MarketingAudience): string =>
  audience === 'team' ? 'private, no-store' : 'no-store';
