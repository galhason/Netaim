'use client';

import { useRef, useState } from 'react';
import type { Locale } from '@/config/locales';
import { GALLERY_COPY } from '../constants/gallery-copy';
import type { GalleryEntry } from '../types/gallery';
import { formatDuration } from '../utils/compose';
import { FilmStill, PlayMark } from './gallery-media';
import { OliveBranch } from './olive-branch';

/*
 * "חיים בתנועה" — the green band with the conference's film.
 *
 * The still and a play mark until someone asks for the film; then the
 * film itself, in place, with the browser's own controls. Nothing plays
 * by itself, and nothing loads but the still until it is asked for. The
 * words are the film's own title and caption when the Studio wrote
 * them, the section's when it did not.
 */
const GalleryFilm = ({ entry, locale }: { entry: GalleryEntry; locale: Locale }) => {
  const [playing, setPlaying] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const words = GALLERY_COPY.film;
  const title = entry.title ?? words.title[locale];
  const lede = entry.caption ?? words.lede[locale];
  const duration = formatDuration(entry.durationSeconds);

  const play = () => {
    setPlaying(true);
    /* The element mounts on this render; focus it once it has. */
    requestAnimationFrame(() => video.current?.focus());
  };

  return (
    <section
      aria-labelledby="gallery-film-title"
      className="relative isolate overflow-hidden bg-[var(--x-forest)] text-[var(--x-on-forest)]"
    >
      <OliveBranch className="pointer-events-none absolute -bottom-10 -start-10 -z-10 size-56 text-[var(--x-on-forest)] opacity-[0.07] md:size-72" />
      <div className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-12 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-12 md:px-8 md:py-16">
        <div className="order-2 text-center md:order-1 md:text-start">
          <h2 id="gallery-film-title" className="font-display text-3xl font-bold leading-tight md:text-4xl">
            {title}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-[var(--x-on-forest-soft)] md:mx-0">{lede}</p>
          {!playing ? (
            <button
              type="button"
              onClick={play}
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-[var(--x-r-pill)] bg-[var(--x-sand)] px-6 text-sm font-bold text-[var(--x-forest)] shadow-[var(--x-shadow)] transition-transform hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--x-sand)] motion-reduce:transition-none"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
                <path d="M8 5.5v13l11-6.5z" />
              </svg>
              {words.watch[locale]}
              {duration ? (
                <span className="sr-only">
                  {' '}
                  ({words.duration[locale]} {duration})
                </span>
              ) : null}
            </button>
          ) : null}
        </div>

        <div className="order-1 md:order-2">
          <div className="relative overflow-hidden rounded-[var(--x-r-card)] bg-[rgb(0_0_0/0.3)] shadow-[0_24px_60px_rgb(0_0_0/0.35)]">
            {playing ? (
              <video
                ref={video}
                controls
                autoPlay
                playsInline
                preload="auto"
                poster={entry.poster?.url}
                aria-label={title}
                className="block aspect-video w-full bg-[rgb(0_0_0)] object-contain"
              >
                <source src={entry.file.url} type={entry.file.mimeType} />
              </video>
            ) : (
              <button
                type="button"
                onClick={play}
                aria-label={`${GALLERY_COPY.play[locale]}: ${title}`}
                className="group relative block w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[var(--x-sand)]"
              >
                <span className="block aspect-video overflow-hidden [&_img]:h-full [&_img]:object-cover [&>*]:h-full">
                  <FilmStill entry={entry} sizes="(min-width: 1152px) 620px, (min-width: 768px) 56vw, 100vw" />
                </span>
                <PlayMark size="lg" duration={entry.durationSeconds} />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default GalleryFilm;
