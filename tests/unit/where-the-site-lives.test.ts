import { afterEach, describe, expect, it, vi } from 'vitest';

/*
 * One address, NEXT_PUBLIC_SERVER_URL, and everything the application
 * derives from it: the origin it may name in a Location header, the
 * base path the browser reaches it under, and the rule that puts that
 * base in front of a path exactly once.
 *
 * The module reads the environment when it loads, so each case loads
 * it afresh.
 */
const load = async (serverUrl: string | undefined) => {
  vi.resetModules();
  if (serverUrl === undefined) {
    vi.stubEnv('NEXT_PUBLIC_SERVER_URL', '');
  } else {
    vi.stubEnv('NEXT_PUBLIC_SERVER_URL', serverUrl);
  }
  return import('@/config/site');
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('where the site lives', () => {
  it('deployed at the root of a domain: origin only, no base path, paths untouched', async () => {
    const site = await load('https://netaimolami.org');
    expect(site.SITE_ORIGIN).toBe('https://netaimolami.org');
    expect(site.SITE_BASE_PATH).toBe('');
    expect(site.withBasePath('/he/events/x/enter')).toBe('/he/events/x/enter');
    expect(site.siteUrl('/he/me')).toBe('https://netaimolami.org/he/me');
  });

  it('under the local rehearsal: the base path is the URL path, and goes in front of every root-relative path', async () => {
    const site = await load('http://localhost/netaim');
    expect(site.SITE_ORIGIN).toBe('http://localhost');
    expect(site.SITE_BASE_PATH).toBe('/netaim');
    expect(site.withBasePath('/he/events/x/enter')).toBe('/netaim/he/events/x/enter');
    expect(site.withBasePath('/api/media/file/a.jpg')).toBe('/netaim/api/media/file/a.jpg');
    expect(site.withBasePath('/')).toBe('/netaim/');
    expect(site.siteUrl('/he/me')).toBe('http://localhost/netaim/he/me');
  });

  it('a trailing slash on the configured URL changes nothing', async () => {
    const site = await load('http://localhost/netaim/');
    expect(site.SITE_BASE_PATH).toBe('/netaim');
    expect(site.withBasePath('/he/me')).toBe('/netaim/he/me');
  });

  it('never prefixes twice, and leaves absolute and protocol-relative URLs alone', async () => {
    const site = await load('http://localhost/netaim');
    expect(site.withBasePath('/netaim/he/me')).toBe('/netaim/he/me');
    expect(site.withBasePath('/netaim')).toBe('/netaim');
    expect(site.withBasePath('/netaimx/he')).toBe('/netaim/netaimx/he');
    expect(site.withBasePath('https://cdn.example/a.jpg')).toBe('https://cdn.example/a.jpg');
    expect(site.withBasePath('//cdn.example/a.jpg')).toBe('//cdn.example/a.jpg');
    expect(site.withBasePath('relative/path')).toBe('relative/path');
  });

  it('with no address configured nothing is prefixed and no origin is claimed', async () => {
    const site = await load(undefined);
    expect(site.SITE_ORIGIN).toBe('');
    expect(site.SITE_BASE_PATH).toBe('');
    expect(site.withBasePath('/he/me')).toBe('/he/me');
  });
});
