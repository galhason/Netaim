import type { Locale } from '@/config/locales';

/*
 * A conference's gallery, in the shapes each reader needs.
 *
 * The Studio edits a GalleryItemSummary — every item, shown or not,
 * with both languages side by side. The public page and the marketing
 * API read GalleryEntry — published items only, in one language, each
 * already resolved to a file a browser can load. An item whose file has
 * gone from the library is not an entry at all.
 */
export const GALLERY_CATEGORIES = [
  'moments',
  'stage',
  'people',
  'networking',
  'venue',
  'food',
  'behind-the-scenes',
] as const;

export type GalleryCategory = (typeof GALLERY_CATEGORIES)[number];

export const isGalleryCategory = (value: string): value is GalleryCategory =>
  (GALLERY_CATEGORIES as readonly string[]).includes(value);

export const GALLERY_STATUSES = ['approved', 'pending'] as const;

export type GalleryStatus = (typeof GALLERY_STATUSES)[number];

export type GalleryKind = 'image' | 'video';

export interface GalleryFile {
  url: string;
  width?: number;
  height?: number;
  mimeType?: string;
}

/* One item as a visitor meets it. */
export interface GalleryEntry {
  id: string;
  kind: GalleryKind;
  /* The photograph, or the film. */
  file: GalleryFile;
  /* A film's still: the item's own poster, else the file's. */
  poster?: GalleryFile;
  alt: string;
  title?: string;
  caption?: string;
  credit?: string;
  category?: GalleryCategory;
  durationSeconds?: number;
  featured: boolean;
  order: number;
}

/* The words of one item in one language. */
export interface GalleryWords {
  title: string;
  caption: string;
  alt: string;
}

/* One item as the Studio edits it. */
export interface GalleryItemSummary {
  id: string;
  mediaId?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  /* The item's own still; the file's own is not an item setting. */
  posterId?: string;
  /* The still to show for a film: the item's, else the file's. */
  posterUrl?: string;
  kind?: GalleryKind;
  words: Record<Locale, GalleryWords>;
  credit: string;
  category?: GalleryCategory;
  durationSeconds?: number;
  featured: boolean;
  published: boolean;
  order: number;
}

export interface GalleryItemInput {
  mediaId?: string;
  /* '' clears the poster. */
  posterId?: string;
  words?: Partial<Record<Locale, Partial<GalleryWords>>>;
  credit?: string;
  /* '' clears the category. */
  category?: GalleryCategory | '';
  /* null clears the running time. */
  durationSeconds?: number | null;
  featured?: boolean;
  published?: boolean;
  order?: number;
}

/* A photograph a participant sent, as the reviewer sees it. */
export interface GallerySubmission {
  id: string;
  file: GalleryFile;
  caption: string;
  credit: string;
  submitter?: { name: string };
  submittedAt: string;
}

/*
 * What the gallery page's form hears back. `sent` means queued for the
 * team, never published; the refusals name what to fix.
 */
export type GallerySubmissionState =
  | { status: 'idle' }
  | { status: 'sent' }
  | {
      status: 'error';
      reason: 'missing' | 'size' | 'type' | 'rights' | 'failed' | 'signed-out' | 'busy' | 'closed';
    };

/* What the gallery page hands over when a participant sends a photograph. */
export interface GallerySubmissionInput {
  file: { name: string; type: string; data: Uint8Array };
  participantId: string;
  credit: string;
  caption: string;
  locale: Locale;
}

export interface GalleryRepository {
  /* Every item the Studio curates — pending submissions excluded. */
  listByEvent: (slug: string) => Promise<GalleryItemSummary[]>;
  /* Published items with a file, in one language, for the public page. */
  listPublished: (slug: string, locale: Locale) => Promise<GalleryEntry[]>;
  create: (slug: string, input: GalleryItemInput) => Promise<GalleryItemSummary>;
  update: (id: string, input: GalleryItemInput) => Promise<GalleryItemSummary | null>;
  remove: (id: string) => Promise<boolean>;
  /* A participant's photograph: stored, held, and queued — never shown. */
  submit: (slug: string, input: GallerySubmissionInput) => Promise<{ id: string } | null>;
  listPending: (slug: string) => Promise<GallerySubmission[]>;
  /* Into the gallery at `order`, shown, and its file released from the hold. */
  approve: (id: string, order: number) => Promise<boolean>;
  /* Gone: the queued item and the file it brought. */
  reject: (id: string) => Promise<boolean>;
}

/*
 * The page's composition: the photograph on the hero, the film in the
 * green band, the story above it and the rest below. Decided once, on
 * the server, from the order and the featured flags the Studio set.
 */
export interface GalleryComposition {
  hero?: GalleryEntry;
  film?: GalleryEntry;
  story: GalleryEntry[];
  more: GalleryEntry[];
}
