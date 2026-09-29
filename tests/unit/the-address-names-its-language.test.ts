import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/* next-intl's middleware is the pass-through after ours; it is not on trial here. */
vi.mock('next-intl/middleware', () => ({
  default: () => () => NextResponse.next(),
}));

/*
 * The address names its language; the cookie only fills a blank.
 *
 * A participant's language preference is mirrored into a cookie for the
 * edge. It used to override the address: a Hebrew reader following the
 * public site's /he/me/networking link, with an account that once chose
 * English, was sent to /en/me/networking — and on staging, to
 * netaimtest.info:3000, because the Location header was built from the
 * upstream's own listener. Both are held here.
 */
const load = async () => {
  vi.resetModules();
  return import('@/middleware');
};

const request = (url: string, cookie?: string) =>
  new NextRequest(url, cookie ? { headers: { cookie } } : undefined);

describe('the address names its language', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SERVER_URL;
  });

  it('serves /he as written when the preference says en', async () => {
    const { default: middleware } = await load();
    const response = middleware(request('https://netaimtest.info:3000/he/me/networking', 'participant_locale=en'));
    expect(response.status).not.toBe(307);
    expect(response.headers.get('location')).toBeNull();
  });

  it('serves /en as written when the preference says he', async () => {
    const { default: middleware } = await load();
    const response = middleware(request('https://netaimtest.info:3000/en/me/networking', 'participant_locale=he'));
    expect(response.status).not.toBe(307);
    expect(response.headers.get('location')).toBeNull();
  });

  it('fills a blank address from the preference, on the public host, without the listener port', async () => {
    const { default: middleware } = await load();
    const response = middleware(request('https://netaimtest.info:3000/me/networking', 'participant_locale=he'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://netaimtest.info/he/me/networking');
  });

  it('never writes the upstream port into a Location header', async () => {
    const { default: middleware } = await load();
    const response = middleware(request('http://127.0.0.1:3000/me', 'participant_locale=en'));
    const location = new URL(response.headers.get('location') ?? '');
    expect(location.port).toBe('');
    expect(location.pathname).toBe('/en/me');
  });
});
