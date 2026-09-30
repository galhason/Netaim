import type { GalleryComposition, GalleryEntry } from '../types/gallery';

/*
 * How many pictures the first, editorial block holds before the film.
 * The rest continue below it, so a gallery of twelve reads as one story
 * and a gallery of sixty does not bury the film under forty photographs.
 */
export const STORY_SIZE = 12;

/*
 * The page, laid out from the Studio's order and its featured marks.
 *
 * The hero is the first featured photograph, or the first photograph at
 * all; the green band plays the first featured film, or the first film.
 * Both are taken out of the grids so nothing is shown twice — unless
 * the hero is the only photograph there is, in which case it is the
 * hero alone, and the grid is simply empty. Nothing is invented: no
 * photograph, no hero; no film, no band.
 */
export const composeGallery = (entries: readonly GalleryEntry[]): GalleryComposition => {
  const all = [...entries];
  const images = all.filter((entry) => entry.kind === 'image');
  const videos = all.filter((entry) => entry.kind === 'video');

  const hero = images.find((entry) => entry.featured) ?? images[0];
  const film = videos.find((entry) => entry.featured) ?? videos[0];

  const rest = all.filter((entry) => entry !== hero && entry !== film);
  const story = rest.slice(0, STORY_SIZE);
  const more = rest.slice(STORY_SIZE);

  return {
    ...(hero ? { hero } : {}),
    ...(film ? { film } : {}),
    story,
    more,
  };
};

/* "2:14", "1:02:05" — the badge on a film's still. */
export const formatDuration = (seconds: number | undefined): string => {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) {
    return '';
  }
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

/* "2:14" or "134" typed in the Studio, as seconds; null when empty or unreadable. */
export const parseDuration = (raw: string): number | null => {
  const text = raw.trim();
  if (text === '') {
    return null;
  }
  if (/^\d+$/.test(text)) {
    return Number(text);
  }
  const parts = text.split(':');
  if (parts.length < 2 || parts.length > 3 || parts.some((part) => !/^\d+$/.test(part))) {
    return null;
  }
  const numbers = parts.map(Number);
  if (numbers.slice(1).some((n) => n >= 60)) {
    return null;
  }
  return numbers.reduce((acc, n) => acc * 60 + n, 0);
};
