import { describe, expect, it, vi } from 'vitest';
import type { GalleryEntry } from '@/features/gallery/types/gallery';

/*
 * How a gallery is laid out, and what one row becomes.
 *
 * The page is composed from two things the Studio sets — the order and
 * the featured marks — and nothing else. These pin the composition
 * (hero, film, the story and what follows it) and the mapping of a stored row into something a visitor may see: a
 * row without a file is not shown, a film prefers its own still, and
 * one language never borrows the other's words.
 */
vi.mock('@/infrastructure/payload/payload-context', () => ({
  getSystemPayload: async () => ({}),
  actorContext: async () => null,
}));

const { STORY_SIZE, composeGallery, formatDuration, parseDuration } = await import(
  '@/features/gallery/utils/compose'
);
const { toGalleryEntry } = await import('@/infrastructure/payload/payload-gallery');

const photo = (id: string, over: Partial<GalleryEntry> = {}): GalleryEntry => ({
  id,
  kind: 'image',
  file: { url: `/api/media/file/${id}.jpg`, width: 1600, height: 1067 },
  alt: `alt ${id}`,
  featured: false,
  order: Number(id.replace(/\D/g, '')) || 0,
  ...over,
});

const film = (id: string, over: Partial<GalleryEntry> = {}): GalleryEntry => ({
  id,
  kind: 'video',
  file: { url: `/api/media/file/${id}.mp4`, mimeType: 'video/mp4' },
  alt: `alt ${id}`,
  featured: false,
  order: Number(id.replace(/\D/g, '')) || 0,
  ...over,
});

describe('the composition', () => {
  it('opens on the first featured photograph, and plays the first featured film', () => {
    const entries = [photo('p1'), film('v2'), photo('p3', { featured: true }), film('v4', { featured: true }), photo('p5')];
    const page = composeGallery(entries);
    expect(page.hero?.id).toBe('p3');
    expect(page.film?.id).toBe('v4');
  });

  it('falls back to the first photograph and the first film when nothing is featured', () => {
    const page = composeGallery([film('v1'), photo('p2'), photo('p3'), film('v4')]);
    expect(page.hero?.id).toBe('p2');
    expect(page.film?.id).toBe('v1');
  });

  it('never shows the hero or the film twice', () => {
    const page = composeGallery([photo('p1'), photo('p2'), film('v3'), film('v4')]);
    const shown = [...page.story, ...page.more].map((entry) => entry.id);
    expect(shown).toEqual(['p2', 'v4']);
    expect(shown).not.toContain(page.hero?.id);
    expect(shown).not.toContain(page.film?.id);
  });

  it('keeps the Studio order in the grids', () => {
    const entries = Array.from({ length: 6 }, (_, i) => photo(`p${i + 1}`));
    expect(composeGallery(entries).story.map((entry) => entry.id)).toEqual(['p2', 'p3', 'p4', 'p5', 'p6']);
  });

  it('fills the story first and continues below the film', () => {
    const entries = Array.from({ length: STORY_SIZE + 6 }, (_, i) => photo(`p${i + 1}`));
    const page = composeGallery(entries);
    expect(page.story).toHaveLength(STORY_SIZE);
    expect(page.more).toHaveLength(5);
    expect(page.more[0]?.id).toBe(`p${STORY_SIZE + 2}`);
  });

  it('has no film band when there is no film', () => {
    const page = composeGallery([photo('p1'), photo('p2')]);
    expect(page.film).toBeUndefined();
  });

  it('shows a lone photograph as the hero alone', () => {
    const page = composeGallery([photo('p1')]);
    expect(page.hero?.id).toBe('p1');
    expect(page.story).toEqual([]);
    expect(page.more).toEqual([]);
  });

  it('has no hero when there are only films', () => {
    const page = composeGallery([film('v1'), film('v2')]);
    expect(page.hero).toBeUndefined();
    expect(page.film?.id).toBe('v1');
    expect(page.story.map((entry) => entry.id)).toEqual(['v2']);
  });

  it('is empty, not broken, with nothing to show', () => {
    const page = composeGallery([]);
    expect(page).toEqual({ story: [], more: [] });
    expect(page.hero).toBeUndefined();
    expect(page.film).toBeUndefined();
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
      { id: 5, media: media(7), title: 'Opening night', caption: 'The hall', credit: ' Dana ', category: 'stage', featured: true, order: 3 },
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
      category: 'stage',
      featured: true,
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

  it('drops a category it does not know', () => {
    expect(toGalleryEntry({ id: 1, media: media(7), category: 'secret' }, 'en')?.category).toBeUndefined();
  });
});
