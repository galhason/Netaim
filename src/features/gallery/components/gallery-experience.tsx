'use client';

import { useState } from 'react';
import type { Locale } from '@/config/locales';
import { EmptyState } from '@/features/conference';
import { GALLERY_COPY } from '../constants/gallery-copy';
import type { GalleryComposition, GalleryEntry } from '../types/gallery';
import GalleryFilm from './gallery-film';
import GalleryLightbox from './gallery-lightbox';
import { FilmStill, GalleryPicture, PlayMark, hasSize } from './gallery-media';

/*
 * The body of the gallery: the editorial grid, the film, the grid that
 * continues below it, and the viewer. One composed story, read top to
 * bottom — there is nothing to filter.
 */
const MORE_STEP = 12;

const STORY_SIZES = '(min-width: 1152px) 370px, (min-width: 768px) 33vw, 50vw';

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
      {entry.featured && entry.title ? (
        <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,rgb(11_58_29/0.82),transparent)] px-3 pb-3 pt-8 text-start text-sm font-semibold text-[var(--x-on-forest)]">
          {entry.title}
        </span>
      ) : null}
    </button>
  );
};

/* The masonry: columns of photographs at their own proportions. */
const Masonry = ({
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
  <ul aria-label={label} className="columns-2 gap-3 md:columns-3 md:gap-4">
    {entries.map((entry) => (
      <li key={entry.id} className="mb-3 break-inside-avoid md:mb-4">
        <Tile entry={entry} locale={locale} sizes={STORY_SIZES} onOpen={() => onOpen(entry)} />
      </li>
    ))}
  </ul>
);

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
          className="gallery-rows__item min-w-0"
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

  const more = composition.more.slice(0, shownMore);
  /* What the viewer moves through: the pictures on the page, in page order. */
  const sequence = [...composition.story, ...more];

  const openOn = (entry: GalleryEntry) => {
    const index = sequence.indexOf(entry);
    setOpen({ list: sequence, index: index === -1 ? 0 : index });
  };

  if (!composition.hero && !composition.film && composition.story.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16">
        <EmptyState title={words.empty.title[locale]} hint={words.empty.hint[locale]} />
      </div>
    );
  }

  return (
    <>
      {composition.story.length > 0 ? (
        <section className="mx-auto max-w-6xl px-3 pb-8 pt-10 md:px-8 md:pb-12 md:pt-14">
          <h2 className="sr-only">{words.storyLabel[locale]}</h2>
          <Masonry entries={composition.story} locale={locale} onOpen={openOn} label={words.storyLabel[locale]} />
        </section>
      ) : null}

      {composition.film ? <GalleryFilm entry={composition.film} locale={locale} /> : null}

      {more.length > 0 ? (
        <section className="mx-auto max-w-6xl px-3 py-8 md:px-8 md:py-12">
          <h2 className="sr-only">{words.moreLabel[locale]}</h2>
          <Rows entries={more} locale={locale} onOpen={openOn} label={words.moreLabel[locale]} />
          {composition.more.length > shownMore ? (
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
