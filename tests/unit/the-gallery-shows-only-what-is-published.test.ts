import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import type { GalleryEntry } from '@/features/gallery/types/gallery';

/*
 * Only what the Studio published leaves the platform.
 *
 * Three doors, three checks. Payload's own REST API answers anyone, so
 * the collection's read rule must return only published rows to anyone
 * who is not the organization's team. The public page and the marketing
 * API read with the system instance, so the published filter must be in
 * the query itself. And the marketing API must ask the published-
 * conference gate first and read the gallery by the id it returns, then
 * pass on the public fields and nothing else.
 */
const calls: string[] = [];
const state: { published: Record<string, string>; entries: GalleryEntry[] } = {
  published: {},
  entries: [],
};
const found: { args: Record<string, unknown>[] } = { args: [] };

vi.mock('@/infrastructure/payload/payload-context', () => ({
  getSystemPayload: async () => ({
    find: async (args: Record<string, unknown>) => {
      found.args.push(args);
      return { docs: [] };
    },
  }),
  actorContext: async () => null,
}));

vi.mock('@/infrastructure', () => ({
  marketingRepository: {
    findPublishedIdentity: async (slug: string) => {
      calls.push(`gate:${slug}`);
      const id = state.published[slug];
      return id ? { id } : null;
    },
    galleryOfEvent: async (eventId: string, locale: string) => {
      calls.push(`gallery:${eventId}:${locale}`);
      return state.entries;
    },
  },
}));

vi.mock('@/features/events', () => ({
  findPortalEvent: async (slug: string) => {
    calls.push(`portal:${slug}`);
    return { slug, title: 'The Summit' };
  },
  findEventOpeningContent: async () => null,
}));

const { publicGallery } = await import('@/features/marketing');
const { payloadGalleryEntriesOfEvent } = await import('@/infrastructure/payload/payload-gallery');
const { GalleryItems, galleryReadAccess } = await import('@/cms/collections/gallery-items');

const ORIGIN = 'https://conference.example.org';

const entry = (over: Partial<GalleryEntry> = {}): GalleryEntry => ({
  id: '11',
  kind: 'image',
  file: { url: '/api/media/file/a.jpg', width: 1200, height: 800, mimeType: 'image/jpeg' },
  alt: 'A hall',
  placement: 'story',
  order: 0,
  ...over,
});

type AccessArgs = Parameters<typeof galleryReadAccess>[0];
const asUser = (user: unknown) => ({ req: { user } }) as unknown as AccessArgs;

describe('the collection’s read rule', () => {
  it('gives an anonymous caller published rows only', () => {
    expect(galleryReadAccess(asUser(null))).toEqual({ published: { equals: true } });
  });

  it('gives a signed-in person with no role published rows only', () => {
    expect(galleryReadAccess(asUser({ id: 1, grants: [] }))).toEqual({ published: { equals: true } });
  });

  it('lets the organization’s team read its own drafts as well', () => {
    expect(galleryReadAccess(asUser({ id: 1, grants: [{ role: 'contentEditor', organization: 4 }] }))).toEqual({
      or: [{ published: { equals: true } }, { organization: { in: [4] } }],
    });
  });

  it('lets the platform owner read everything', () => {
    expect(galleryReadAccess(asUser({ id: 1, grants: [{ role: 'platformOwner' }] }))).toBe(true);
  });
});

describe('the collection’s write rules', () => {
  const access = GalleryItems.access!;
  const call = (name: 'create' | 'update' | 'delete', user: unknown, data?: unknown) =>
    (access[name] as (args: unknown) => unknown)({ req: { user }, data });

  it('refuses every write to an anonymous caller', () => {
    for (const name of ['create', 'update', 'delete'] as const) {
      expect(call(name, null), name).toBe(false);
    }
  });

  it('refuses every write to a person with no role — a participant', () => {
    for (const name of ['create', 'update', 'delete'] as const) {
      expect(call(name, { id: 9, grants: [] }, { organization: 4 }), name).toBe(false);
    }
  });

  it('refuses a reviewer, who may read but not write', () => {
    expect(call('create', { id: 9, grants: [{ role: 'reviewer', organization: 4 }] }, { organization: 4 })).toBe(false);
    expect(call('update', { id: 9, grants: [{ role: 'reviewer', organization: 4 }] })).toBe(false);
  });

  it('lets the organization’s editors write within their organization only', () => {
    const editor = { id: 9, grants: [{ role: 'contentEditor', organization: 4 }] };
    expect(call('create', editor, { organization: 4 })).toBe(true);
    expect(call('create', editor, { organization: 5 })).toBe(false);
    expect(call('update', editor)).toEqual({ organization: { in: [4] } });
    expect(call('delete', editor)).toEqual({ organization: { in: [4] } });
  });
});

describe('the public read', () => {
  it('asks for published, approved rows of the one conference, in one language, with no fallback', async () => {
    found.args = [];
    await payloadGalleryEntriesOfEvent('42', 'en');
    const args = found.args[0]!;
    expect(args.collection).toBe('gallery-items');
    expect(args.locale).toBe('en');
    expect(args.fallbackLocale).toBe(false);
    expect(args.where).toEqual({
      and: [
        { event: { equals: '42' } },
        { published: { equals: true } },
        { or: [{ status: { equals: 'approved' } }, { status: { exists: false } }] },
      ],
    });
  });
});

describe('the marketing API', () => {
  it('answers nothing for a conference that is not published, and reads nothing', async () => {
    calls.length = 0;
    state.published = {};
    expect(await publicGallery('draft', 'he', ORIGIN)).toBeNull();
    expect(calls).toEqual(['gate:draft']);
  });

  it('reads the gallery by the verified id, not by the slug', async () => {
    calls.length = 0;
    state.published = { summit: '42' };
    state.entries = [entry()];
    await publicGallery('summit', 'en', ORIGIN);
    expect(calls[0]).toBe('gate:summit');
    expect(calls).toContain('gallery:42:en');
  });

  it('passes the public fields, with absolute media addresses, and nothing else', async () => {
    state.published = { summit: '42' };
    state.entries = [
      entry({
        ...({ organization: 4, event: 42, published: false, mediaId: '7' } as object),
        title: 'Opening',
        caption: 'The hall',
        credit: 'Dana',
        placement: 'hero',
      }),
      entry({
        id: '12',
        kind: 'video',
        file: { url: '/api/media/file/f.mp4', mimeType: 'video/mp4' },
        poster: { url: '/api/media/file/still.jpg', width: 1600, height: 900 },
        durationSeconds: 134,
      }),
    ];
    const gallery = await publicGallery('summit', 'en', ORIGIN);
    expect(gallery).toEqual({
      slug: 'summit',
      locale: 'en',
      title: 'The Summit',
      items: [
        {
          id: '11',
          kind: 'image',
          url: `${ORIGIN}/api/media/file/a.jpg`,
          width: 1200,
          height: 800,
          alt: 'A hall',
          title: 'Opening',
          caption: 'The hall',
          credit: 'Dana',
          placement: 'hero',
        },
        {
          id: '12',
          kind: 'video',
          url: `${ORIGIN}/api/media/file/f.mp4`,
          mimeType: 'video/mp4',
          poster: { url: `${ORIGIN}/api/media/file/still.jpg`, width: 1600, height: 900 },
          alt: 'A hall',
          durationSeconds: 134,
          placement: 'story',
        },
      ],
    });
    const text = JSON.stringify(gallery);
    for (const word of ['organization', 'published', 'mediaId', '"event"']) {
      expect(text, word).not.toContain(word);
    }
  });
});

describe('the endpoint', () => {
  const route = readFileSync('src/app/(frontend)/api/public/conferences/[slug]/gallery/route.ts', 'utf8');

  it('reads, and only reads', () => {
    expect(route).toMatch(/export const GET\b/);
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      expect(route, method).not.toMatch(new RegExp(`export const ${method}\\b`));
    }
  });

  it('asks for the marketing secret, checks the locale and throttles, like the programme', () => {
    expect(route).toContain('marketingRequestAuthorized(');
    expect(route).toContain('MARKETING_API_SECRET');
    expect(route).toContain('isSupportedLocale(locale)');
    expect(route).toContain("checkRateLimit('marketing-api'");
    expect(route).toContain('publicGallery(slug, locale as Locale, siteOrigin(request))');
  });

  it('leaves the programme endpoint as it was', () => {
    const program = readFileSync('src/app/(frontend)/api/public/conferences/[slug]/program/route.ts', 'utf8');
    expect(program).toContain('publicProgram(slug, locale as Locale, siteOrigin(request))');
    expect(program).not.toContain('publicGallery');
  });
});
