import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * The marketing site asks the platform "is this visitor signed in?" from
 * the visitor's own browser. The answer greets, it does not disclose;
 * it goes only to the same origin; and it is never cached.
 */
const state = {
  me: null as { id: string; name: string; email: string } | null,
  photo: undefined as string | undefined,
  cleared: 0,
};

vi.mock('@/features/registration', () => ({
  currentParticipant: async () => state.me,
  getMyDetails: async () => (state.me ? { name: state.me.name, email: state.me.email, photoUrl: state.photo } : null),
  clearSession: async () => {
    state.cleared += 1;
  },
}));

vi.mock('@/features/events', () => ({
  getActiveConferenceSlug: async () => 'brkt',
}));
vi.mock('@/features/notifications', () => ({
  mySpotlight: async (_slug: string, locale: string) => ({
    banner: { id: 'n1', subject: locale === 'en' ? 'Lunch moved' : 'הצהריים זזו', body: '12:30', type: 'announcement.banner', locale },
    popup: null,
  }),
}));

const load = () => import('@/app/(frontend)/api/session/route');
const request = (method: string, headers: Record<string, string> = {}) =>
  new NextRequest('http://localhost/netaim/api/session', { method, headers });

describe('who is at the door', () => {
  beforeEach(() => {
    state.me = null;
    state.photo = undefined;
    state.cleared = 0;
  });

  it('says "nobody" to a stranger, and never caches it', async () => {
    const { GET } = await load();
    const response = await GET(request('GET', { 'sec-fetch-site': 'same-origin' }));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(await response.json()).toEqual({ signedIn: false });
  });

  it('greets a signed-in guest by first name, with initials and no email', async () => {
    state.me = { id: 'p1', name: 'גל חסון', email: 'gal@example.org' };
    const { GET } = await load();
    const body = await (await GET(request('GET', { 'sec-fetch-site': 'same-origin' }))).json();
    expect(body.signedIn).toBe(true);
    expect(body.firstName).toBe('גל');
    expect(body.initials).toBe('גח');
    expect(body.photoUrl).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain('example.org');
    expect(JSON.stringify(body)).not.toContain('"p1"');
    expect(body.links.signOut).toMatch(/\/api\/session$/);
    expect(body.spotlight).toEqual({ banner: { id: 'n1', subject: 'הצהריים זזו', body: '12:30' }, popup: null });
  });

  it('speaks the language of the asking page', async () => {
    state.me = { id: 'p1', name: 'Gal Hason', email: 'gal@example.org' };
    const { GET } = await load();
    const en = new NextRequest('http://localhost/netaim/api/session?locale=en', { headers: { 'sec-fetch-site': 'same-origin' } });
    const body = await (await GET(en)).json();
    expect(body.locale).toBe('en');
    expect(body.spotlight.banner.subject).toBe('Lunch moved');
    expect(body.links.notifications).toMatch(/\/en\/me\/notifications$/);
  });

  it('refuses another site, on reading and on signing out', async () => {
    state.me = { id: 'p1', name: 'Gal', email: 'gal@example.org' };
    const { GET, DELETE } = await load();
    expect((await GET(request('GET', { 'sec-fetch-site': 'cross-site' }))).status).toBe(403);
    expect((await DELETE(request('DELETE', { 'sec-fetch-site': 'cross-site', origin: 'https://evil.example' }))).status).toBe(403);
    expect(state.cleared).toBe(0);
  });

  it('signs out on a same-origin DELETE', async () => {
    state.me = { id: 'p1', name: 'Gal', email: 'gal@example.org' };
    const { DELETE } = await load();
    const response = await DELETE(request('DELETE', { 'sec-fetch-site': 'same-origin' }));
    expect(response.status).toBe(204);
    expect(state.cleared).toBe(1);
  });
});
