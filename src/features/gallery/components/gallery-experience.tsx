'use client';

import { useState } from 'react';
import type { Locale } from '@/config/locales';
import { EmptyState } from '@/features/conference';
import { GALLERY_COPY } from '../constants/gallery-copy';
import type { GalleryComposition, GalleryEntry } from '../types/gallery';
import GalleryFilm from './gallery-film';
import GalleryLightbox from './gallery-lightbox';
import { columnsOf, editorialLayout, type TileShape } from '../utils/editorial-layout';
import { FilmStill, GalleryPicture, PlayMark, hasSize } from './gallery-media';

/*
 * The body of the gallery: the editorial grid, the film, the grid that
 * continues below it, and the viewer. One composed story, read top to
 * bottom — there is nothing to filter.
 */
const MORE_STEP = 12;

/* A run of the editorial grid — see editorialLayout. */
const LEAD_FALLBACK = 9;

const ratioOf = (entry: GalleryEntry): number => {
  const file = entry.kind === 'video' ? (entry.poster ?? entry.file) : entry.file;
  return hasSize(file) ? file.width / file.height : entry.kind === 'video' ? 16 / 9 : 4 / 3;
};

interface TileProps {
  entry: GalleryEntry;
  locale: Locale;
  sizes: string;
  onOpen: () => void;
  className?: string;
}

/* One picture in a grid: a button that opens the viewer on it. */
const Tile = ({ entry, locale, sizes, onOpen, className = '' }: TileProps) => {
  const label = `${entry.kind === 'video' ? GALLERY_COPY.openVideo[locale] : GALLERY_COPY.openPhoto[locale]}: ${entry.title ?? entry.alt}`;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={label}
      className={`group relative block w-full overflow-hidden rounded-[var(--nt-r-md)] bg-[var(--x-bg-deep)] shadow-[var(--x-shadow)] transition-shadow duration-200 hover:shadow-[var(--x-shadow-lift)] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--x-primary)] motion-reduce:transition-none ${className}`}
    >
      <span className="block transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100 [&_img]:h-full [&_img]:object-cover">
        {entry.kind === 'video' ? <FilmStill entry={entry} sizes={sizes} /> : <GalleryPicture file={entry.file} alt="" sizes={sizes} />}
      </span>
      {entry.kind === 'video' ? <PlayMark duration={entry.durationSeconds} /> : null}
      {entry.title ? (
        <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,rgb(11_58_29/0.82),transparent)] px-3 pb-3 pt-8 text-start text-sm font-semibold text-[var(--x-on-forest)]">
          {entry.title}
        </span>
      ) : null}
    </button>
  );
};

/*
 * Each shape as whole class names, so the stylesheet is built with
 * exactly these and no others.
 */
const DESK_SPAN: Record<string, string> = {
  '2x2': 'md:col-span-2 md:row-span-2',
  '3x2': 'md:col-span-3 md:row-span-2',
  '4x2': 'md:col-span-4 md:row-span-2',
  '5x2': 'md:col-span-5 md:row-span-2',
  '6x2': 'md:col-span-6 md:row-span-2',
  '8x2': 'md:col-span-8 md:row-span-2',
  '4x4': 'md:col-span-4 md:row-span-4',
  '5x4': 'md:col-span-5 md:row-span-4',
  '6x4': 'md:col-span-6 md:row-span-4',
  '7x4': 'md:col-span-7 md:row-span-4',
  '12x4': 'md:col-span-12 md:row-span-4',
};

const PHONE_SPAN: Record<string, string> = {
  '1x1': 'col-span-1 row-span-1',
  '1x2': 'col-span-1 row-span-2',
  '2x2': 'col-span-2 row-span-2',
};

/* The grid's content width on a wide screen, for the images' sizes. */
const GRID_WIDTH = 1088;

const editorialSizes = (desk: TileShape, phone: TileShape) => {
  const share = columnsOf(desk) / 12;
  return `(min-width: 1152px) ${Math.round(share * GRID_WIDTH)}px, (min-width: 768px) ${Math.round(share * 100)}vw, ${columnsOf(phone) === 2 ? 100 : 50}vw`;
};

/*
 * The editorial grid: a lead picture, a wide one and smaller ones
 * around them, every picture cropped to its cell — see
 * editorialLayout for the shapes. The first pictures load first; the
 * rest wait until they scroll near.
 */
const Editorial = ({
  entries,
  locale,
  onOpen,
  label,
}: {
  entries: GalleryEntry[];
  locale: Locale;
  onOpen: (entry: GalleryEntry) => void;
  label: string;
}) => {
  const layout = editorialLayout(entries.length);
  return (
    <ul
      aria-label={label}
      className="grid grid-flow-row auto-rows-[7.5rem] grid-cols-2 gap-3 sm:auto-rows-[10rem] md:auto-rows-[4.5rem] md:grid-cols-12 md:gap-4 lg:auto-rows-[5.25rem]"
    >
      {entries.map((entry, index) => {
        const shape = layout[index] ?? { desk: '3x2', phone: '1x1' };
        return (
          <li key={entry.id} className={`gallery-reveal min-w-0 ${PHONE_SPAN[shape.phone] ?? ''} ${DESK_SPAN[shape.desk] ?? ''}`}>
            <Tile
              entry={entry}
              locale={locale}
              sizes={editorialSizes(shape.desk, shape.phone)}
              onOpen={() => onOpen(entry)}
              className="h-full [&>span]:h-full [&>span>span]:h-full [&>span>span]:aspect-auto"
            />
          </li>
        );
      })}
    </ul>
  );
};

/*
 * The grid below the film: justified rows, each picture as wide as its
 * proportion asks at a common height, so the rows read as a contact
 * sheet rather than a second masonry. The spacer at the end stops the
 * last, short row from stretching.
 */
const Rows = ({
  entries,
  locale,
  onOpen,
  label,
}: {
  entries: GalleryEntry[];
  locale: Locale;
  onOpen: (entry: GalleryEntry) => void;
  label: string;
}) => (
  <ul aria-label={label} className="gallery-rows flex flex-wrap gap-3 md:gap-4">
    {entries.map((entry) => {
      const ratio = ratioOf(entry);
      return (
        <li
          key={entry.id}
          className="gallery-rows__item gallery-reveal min-w-0"
          style={{ ['--r' as string]: ratio.toFixed(4), flexGrow: ratio }}
        >
          <Tile
            entry={entry}
            locale={locale}
            sizes="(min-width: 768px) 40vw, 60vw"
            onOpen={() => onOpen(entry)}
            className="h-full [&>span]:h-full [&>span>span]:h-full [&>span>span]:aspect-auto"
          />
        </li>
      );
    })}
    <li aria-hidden="true" className="grow-[10] basis-0" />
  </ul>
);

interface GalleryExperienceProps {
  locale: Locale;
  composition: GalleryComposition;
}

const GalleryExperience = ({ locale, composition }: GalleryExperienceProps) => {
  const [shownMore, setShownMore] = useState(MORE_STEP);
  const [open, setOpen] = useState<{ list: GalleryEntry[]; index: number } | null>(null);
  const words = GALLERY_COPY;

  /*
   * The grid above the film is the main grid's; when the Studio put
   * nothing there yet, the first of the pictures further down open the
   * page instead, so it never goes from the hero straight to the film.
   */
  const lead = composition.story.length > 0 ? composition.story : composition.more.slice(0, LEAD_FALLBACK);
  const below = composition.story.length > 0 ? composition.more : composition.more.slice(LEAD_FALLBACK);
  const more = below.slice(0, shownMore);
  /* What the viewer moves through: the pictures on the page, in page order. */
  const sequence = [...lead, ...more];

  const openOn = (entry: GalleryEntry) => {
    const index = sequence.indexOf(entry);
    setOpen({ list: sequence, index: index === -1 ? 0 : index });
  };

  if (!composition.hero && !composition.film && lead.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16">
        <EmptyState title={words.empty.title[locale]} hint={words.empty.hint[locale]} />
      </div>
    );
  }

  return (
    <>
      {lead.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 pb-10 pt-8 md:px-8 md:pb-14 md:pt-12">
          <h2 className="sr-only">{words.storyLabel[locale]}</h2>
          <Editorial entries={lead} locale={locale} onOpen={openOn} label={words.storyLabel[locale]} />
        </section>
      ) : null}

      {composition.film ? <GalleryFilm entry={composition.film} locale={locale} /> : null}

      {more.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 pb-12 pt-10 md:px-8 md:pb-16 md:pt-14">
          <h2 className="sr-only">{words.moreLabel[locale]}</h2>
          <Rows entries={more} locale={locale} onOpen={openOn} label={words.moreLabel[locale]} />
          {below.length > shownMore ? (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => setShownMore((n) => n + MORE_STEP)}
                className="inline-flex min-h-11 items-center rounded-[var(--x-r-pill)] border border-[var(--x-primary)] px-6 text-sm font-bold text-[var(--x-primary)] transition-colors hover:bg-[var(--x-primary-wash)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--x-primary)]"
              >
                {words.showMore[locale]}
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {open ? (
        <GalleryLightbox
          locale={locale}
          entries={open.list}
          index={open.index}
          onIndex={(index) => setOpen((current) => (current ? { ...current, index } : current))}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </>
  );
};

export default GalleryExperience;
