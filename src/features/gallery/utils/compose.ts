import type { GalleryComposition, GalleryEntry, GalleryPlacement } from '../types/gallery';

/*
 * The page, laid out exactly as the Studio placed it.
 *
 * Nothing is chosen here. The opening photograph is the item placed as
 * the hero, the film in the green band the item placed as the film, and
 * the two grids are what was placed in each, in the Studio's order. An
 * empty slot stays empty: no hero chosen, the page opens on the brand's
 * green; no film chosen, there is no band.
 */
export const composeGallery = (entries: readonly GalleryEntry[]): GalleryComposition => {
  const placed = (placement: GalleryPlacement) =>
    entries.filter((entry) => entry.placement === placement);
  const hero = placed('hero').find((entry) => entry.kind === 'image');
  const film = placed('film').find((entry) => entry.kind === 'video');
  return {
    ...(hero ? { hero } : {}),
    ...(film ? { film } : {}),
    story: placed('story'),
    more: placed('more'),
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
