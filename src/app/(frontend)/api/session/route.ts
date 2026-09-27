import { NextResponse, type NextRequest } from 'next/server';
import { SITE_ORIGIN, withBasePath } from '@/config/site';
import { getActiveConferenceSlug } from '@/features/events';
import { mySpotlight } from '@/features/notifications';
import {
  clearSession,
  currentParticipant,
  getMyDetails,
} from '@/features/registration';

/*
 * "Am I signed in?" — asked by the browser, for the WordPress site.
 *
 * The marketing site and the platform share an origin, so the platform's
 * session cookie travels with a fetch from any of the site's pages. This
 * route answers that fetch and nothing else: a page cached for every
 * visitor can still greet the one who is signed in, because the greeting
 * is fetched, not printed.
 *
 * What it tells: a first name to greet with, initials or a picture for
 * the chip, where the account lives — and the production's spotlight
 * for this guest (the ticker line and the pop-up the Studio broadcast
 * for the live conference), so the marketing site can show what the
 * platform's own pages show. What it does not tell: the email, the id,
 * anything about registrations. The site wants to say hello, not to
 * know.
 *
 * `?locale=he|en` names the language of the asking page; the guest's
 * stored preference is the fallback, Hebrew the last resort.
 *
 * Who may ask: the same origin only. The browser's own `Sec-Fetch-Site`
 * header settles it — a page on another site gets a 403 and, without
 * CORS headers, could not read a 200 anyway. DELETE signs out, under the
 * same rule: a cross-site form cannot end a session here.
 *
 * Never cached: the answer is one visitor's and true for one moment.
 */
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, private', Vary: 'Cookie' };

const sameOrigin = (request: NextRequest): boolean => {
  const site = request.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') {
    return false;
  }
  const origin = request.headers.get('origin');
  return !origin || origin === SITE_ORIGIN || origin === request.nextUrl.origin;
};

const initialsOf = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join('');

export async function GET(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403, headers: NO_STORE });
  }
  const me = await currentParticipant().catch(() => null);
  if (!me) {
    return NextResponse.json({ signedIn: false }, { headers: NO_STORE });
  }
  const asked = request.nextUrl.searchParams.get('locale');
  const preferred = request.cookies.get('participant_locale')?.value;
  const locale = asked === 'en' || asked === 'he' ? asked : preferred === 'en' ? 'en' : 'he';
  const [details, slug] = await Promise.all([
    getMyDetails().catch(() => null),
    getActiveConferenceSlug(locale).catch(() => null),
  ]);
  const spotlight = slug
    ? await mySpotlight(slug, locale).catch(() => ({ banner: null, popup: null }))
    : { banner: null, popup: null };
  const note = (entry: { id: string; subject: string; body: string } | null) =>
    entry ? { id: entry.id, subject: entry.subject, body: entry.body } : null;
  const name = (details?.name ?? me.name ?? '').trim();
  return NextResponse.json(
    {
      signedIn: true,
      name,
      firstName: name.split(/\s+/)[0] ?? '',
      initials: initialsOf(name || me.email),
      ...(details?.photoUrl ? { photoUrl: details.photoUrl } : {}),
      locale,
      spotlight: { banner: note(spotlight.banner), popup: note(spotlight.popup) },
      links: {
        me: withBasePath(`/${locale}/me`),
        profile: withBasePath(`/${locale}/me/profile`),
        messages: withBasePath(`/${locale}/me/messages`),
        networking: withBasePath(`/${locale}/me/networking`),
        notifications: withBasePath(`/${locale}/me/notifications`),
        signOut: withBasePath('/api/session'),
      },
    },
    { headers: NO_STORE },
  );
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403, headers: NO_STORE });
  }
  await clearSession().catch(() => undefined);
  return new NextResponse(null, { status: 204, headers: NO_STORE });
}
