import { describe, expect, it, vi } from 'vitest';
import type { GalleryEntry } from '@/features/gallery/types/gallery';

/*
 * How a gallery is laid out, and what one row becomes.
 *
 * The page is composed from two things the Studio sets — where each
 * item is placed and the order — and nothing else; an empty place stays
 * empty. These pin the composition and the mapping of a stored row into
 * something a visitor may see: a row without a file is not shown, a film
 * prefers its own still, and one language never borrows the other's
 * words.
 */
vi.mock('@/infrastructure/payload/payload-context', () => ({
  getSystemPayload: async () => ({}),
  actorContext: async () => null,
}));

const { composeGallery, formatDuration, parseDuration } = await import(
  '@/features/gallery/utils/compose'
);
const { toGalleryEntry } = await import('@/infrastructure/payload/payload-gallery');

const photo = (id: string, over: Partial<GalleryEntry> = {}): GalleryEntry => ({
  id,
  kind: 'image',
  file: { url: `/api/media/file/${id}.jpg`, width: 1600, height: 1067 },
  alt: `alt ${id}`,
  placement: 'story',
  order: Number(id.replace(/\D/g, '')) || 0,
  ...over,
});

const film = (id: string, over: Partial<GalleryEntry> = {}): GalleryEntry => ({
  id,
  kind: 'video',
  file: { url: `/api/media/file/${id}.mp4`, mimeType: 'video/mp4' },
  alt: `alt ${id}`,
  placement: 'story',
  order: Number(id.replace(/\D/g, '')) || 0,
  ...over,
});

describe('the composition', () => {
  it('opens on the photograph placed as the hero, and plays the film placed as the film', () => {
    const entries = [photo('p1'), film('v2'), photo('p3', { placement: 'hero' }), film('v4', { placement: 'film' }), photo('p5')];
    const page = composeGallery(entries);
    expect(page.hero?.id).toBe('p3');
    expect(page.film?.id).toBe('v4');
  });

  it('chooses nothing by itself: no hero placed, no hero; no film placed, no band', () => {
    const page = composeGallery([film('v1'), photo('p2'), photo('p3'), film('v4')]);
    expect(page.hero).toBeUndefined();
    expect(page.film).toBeUndefined();
    expect(page.story.map((entry) => entry.id)).toEqual(['v1', 'p2', 'p3', 'v4']);
  });

  it('puts each item in the grid it was placed in, in the Studio order', () => {
    const page = composeGallery([
      photo('p1'),
      photo('p2', { placement: 'more' }),
      photo('p3'),
      photo('p4', { placement: 'more' }),
    ]);
    expect(page.story.map((entry) => entry.id)).toEqual(['p1', 'p3']);
    expect(page.more.map((entry) => entry.id)).toEqual(['p2', 'p4']);
  });

  it('never shows the hero or the film in a grid', () => {
    const page = composeGallery([photo('p1', { placement: 'hero' }), photo('p2'), film('v3', { placement: 'film' }), film('v4', { placement: 'more' })]);
    const shown = [...page.story, ...page.more].map((entry) => entry.id);
    expect(shown).toEqual(['p2', 'v4']);
  });

  it('ignores a film placed as the hero and a photograph placed as the film', () => {
    const page = composeGallery([film('v1', { placement: 'hero' }), photo('p2', { placement: 'film' })]);
    expect(page.hero).toBeUndefined();
    expect(page.film).toBeUndefined();
  });

  it('shows a lone photograph placed as the hero alone', () => {
    const page = composeGallery([photo('p1', { placement: 'hero' })]);
    expect(page.hero?.id).toBe('p1');
    expect(page.story).toEqual([]);
    expect(page.more).toEqual([]);
  });

  it('is empty, not broken, with nothing to show', () => {
    expect(composeGallery([])).toEqual({ story: [], more: [] });
  });
});

describe('a film’s running time', () => {
  it('prints minutes and seconds, and hours when there are any', () => {
    expect(formatDuration(134)).toBe('02:14');
    expect(formatDuration(3725)).toBe('1:02:05');
    expect(formatDuration(undefined)).toBe('');
    expect(formatDuration(0)).toBe('');
  });

  it('reads what the Studio types', () => {
    expect(parseDuration('2:14')).toBe(134);
    expect(parseDuration('134')).toBe(134);
    expect(parseDuration('1:02:05')).toBe(3725);
    expect(parseDuration('')).toBeNull();
    expect(parseDuration('2:75')).toBeNull();
    expect(parseDuration('two minutes')).toBeNull();
  });
});

describe('a stored row, as a visitor meets it', () => {
  const media = (id: number, over: Record<string, unknown> = {}) => ({
    id,
    url: `/api/media/file/${id}.jpg`,
    alt: 'The file’s own alt',
    mimeType: 'image/jpeg',
    width: 1200,
    height: 800,
    ...over,
  });

  it('is nothing when its file has gone from the library', () => {
    expect(toGalleryEntry({ id: 1, media: null }, 'he')).toBeNull();
    expect(toGalleryEntry({ id: 1, media: 7 }, 'he')).toBeNull();
    expect(toGalleryEntry({ id: 1, media: { id: 7, url: null } }, 'he')).toBeNull();
  });

  it('carries the file, its size and the Studio’s words', () => {
    const entry = toGalleryEntry(
      { id: 5, media: media(7), title: 'Opening night', caption: 'The hall', credit: ' Dana ', placement: 'hero', order: 3 },
      'en',
    );
    expect(entry).toEqual({
      id: '5',
      kind: 'image',
      file: { url: '/api/media/file/7.jpg', width: 1200, height: 800, mimeType: 'image/jpeg' },
      alt: 'The file’s own alt',
      title: 'Opening night',
      caption: 'The hall',
      credit: 'Dana',
      placement: 'hero',
      order: 3,
    });
  });

  it('gives a film its own still first, then the file’s, then none', () => {
    const video = media(8, { url: '/api/media/file/8.mp4', mimeType: 'video/mp4', poster: media(9) });
    expect(toGalleryEntry({ id: 1, media: video, poster: media(10) }, 'he')?.poster?.url).toBe('/api/media/file/10.jpg');
    expect(toGalleryEntry({ id: 1, media: video }, 'he')?.poster?.url).toBe('/api/media/file/9.jpg');
    const bare = media(8, { url: '/api/media/file/8.mp4', mimeType: 'video/mp4' });
    const entry = toGalleryEntry({ id: 1, media: bare }, 'he');
    expect(entry?.kind).toBe('video');
    expect(entry?.poster).toBeUndefined();
  });

  it('never borrows the other language', () => {
    const row = {
      id: 1,
      media: media(7, { alt: { he: 'חלופי', en: null } }),
      title: { he: 'ערב הפתיחה', en: null },
      caption: { he: 'האולם', en: null },
      alt: { he: null, en: null },
    };
    const english = toGalleryEntry(row, 'en');
    expect(english?.title).toBeUndefined();
    expect(english?.caption).toBeUndefined();
    expect(english?.alt).toBe('A photo from the conference');
    expect(JSON.stringify(english)).not.toMatch(/[֐-׿]/);
    const hebrew = toGalleryEntry(row, 'he');
    expect(hebrew?.title).toBe('ערב הפתיחה');
    expect(hebrew?.alt).toBe('חלופי');
  });

  it('prefers the item’s alt, then the file’s, then the title', () => {
    expect(toGalleryEntry({ id: 1, media: media(7), alt: 'Item alt' }, 'en')?.alt).toBe('Item alt');
    expect(toGalleryEntry({ id: 1, media: media(7, { alt: null }), title: 'A title' }, 'en')?.alt).toBe('A title');
  });

  it('reads an unknown or missing placement as the main grid', () => {
    expect(toGalleryEntry({ id: 1, media: media(7), placement: 'secret' }, 'en')?.placement).toBe('story');
    expect(toGalleryEntry({ id: 1, media: media(7) }, 'en')?.placement).toBe('story');
  });
});
