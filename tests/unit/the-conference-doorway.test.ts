import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

/*
 * The conference doorway, /{locale}/events/{slug}/enter, and the one
 * rule it must keep: a link that says "sign in" never lands on the
 * registration form. What it does depends on exactly three things —
 * whether a magic-link token came along, whether that token is good,
 * and whether the visitor already holds a session — and every
 * combination is spelled out below.
 */
const state = {
  session: null as { id: string } | null,
  goodTokens: new Set<string>(),
  totpTokens: new Set<string>(),
  established: [] as string[],
};

vi.mock('@/features/registration', () => ({
  signInWithLink: async (token: string) => {
    if (state.totpTokens.has(token)) {
      return { ok: false, reason: 'totp', ticket: 'ticket-' + token };
    }
    if (!state.goodTokens.has(token)) {
      return { ok: false, reason: 'invalid' };
    }
    state.established.push('p-' + token);
    return { ok: true, participant: { id: 'p-' + token, name: '', email: '' } };
  },
  currentParticipant: async () => state.session,
}));

vi.mock('@/shared', () => ({
  siteOrigin: () => 'https://netaimolami.org',
  siteRedirect: (_request: unknown, path: string) =>
    `https://netaimolami.org${path}`,
}));

const enter = async (query = '') => {
  const { GET } = await import(
    '@/app/(frontend)/[locale]/events/[slug]/enter/route'
  );
  const request = new NextRequest(
    'https://netaimolami.org/he/events/brkt/enter' + query,
  );
  const response = await GET(request, {
    params: Promise.resolve({ locale: 'he', slug: 'brkt' }),
  });
  const url = new URL(response.headers.get('location') ?? '');
  return {
    status: response.status,
    location: url.pathname,
    query: url.searchParams,
  };
};

describe('the conference doorway', () => {
  beforeEach(() => {
    state.session = null;
    state.goodTokens = new Set(['t-ok']);
    state.totpTokens = new Set(['t-2fa']);
    state.established = [];
  });

  it('sends a visitor without a token or a session to the sign-in screen, never to register', async () => {
    const { status, location } = await enter();
    expect(status).toBeGreaterThanOrEqual(300);
    expect(location).toBe('/he/me');
    expect(location).not.toContain('register');
  });

  it('lets someone who already holds a session straight into the conference', async () => {
    state.session = { id: 'p-1' };
    expect((await enter()).location).toBe('/he/events/brkt/me');
  });

  it('signs a good magic link in and continues to the conference', async () => {
    const { location } = await enter('?token=t-ok');
    expect(state.established).toEqual(['p-t-ok']);
    expect(location).toBe('/he/events/brkt/me');
  });

  it('treats a spent or forged token like no token at all', async () => {
    const { location } = await enter('?token=t-bad');
    expect(state.established).toEqual([]);
    expect(location).toBe('/he/me');
  });

  it('sends an account with an authenticator to the authenticator step, then back to the conference', async () => {
    const { location, query } = await enter('?token=t-2fa');
    expect(state.established).toEqual([]);
    expect(location).toBe('/he/me');
    expect(query.get('state')).toBe('totp');
    expect(query.get('ticket')).toBe('ticket-t-2fa');
    expect(query.get('next')).toBe('/he/events/brkt/me');
  });

  it('keeps the language of the link', async () => {
    const { GET } = await import(
      '@/app/(frontend)/[locale]/events/[slug]/enter/route'
    );
    const response = await GET(
      new NextRequest('https://netaimolami.org/en/events/brkt/enter'),
      { params: Promise.resolve({ locale: 'en', slug: 'brkt' }) },
    );
    expect(new URL(response.headers.get('location') ?? '').pathname).toBe('/en/me');
  });
});
