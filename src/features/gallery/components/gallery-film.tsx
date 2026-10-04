'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Locale } from '@/config/locales';
import { GALLERY_COPY } from '../constants/gallery-copy';
import type { GalleryEntry } from '../types/gallery';
import { formatDuration } from '../utils/compose';
import { FilmStill, PlayMark } from './gallery-media';
import { OliveBranch } from './olive-branch';

/*
 * "חיים בתנועה" — the conference's film, as a green panel inside the
 * page's width rather than a band across it: the still with a play
 * mark on one side, the title, a line and a play button on the other.
 * The film itself opens over the page, so the panel stays its size.
 * Nothing plays by itself, and nothing but the still loads until the
 * film is asked for. The words are the film's own title and caption
 * when the Studio wrote them, the section's when it did not.
 */
const PLAY_ICON = (
  <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
    <path d="M8 5.5v13l11-6.5z" />
  </svg>
);

const FOCUSABLE = 'button, video, [href], [tabindex]:not([tabindex="-1"])';

/*
 * The film over the page: the focus moves into it and stays, the page
 * behind it is held still, Escape or the backdrop closes it and the
 * focus goes back to what opened it.
 */
const FilmPlayer = ({ entry, title, locale, onClose }: { entry: GalleryEntry; title: string; locale: Locale; onClose: () => void }) => {
  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const close = GALLERY_COPY.lightbox.close[locale];

  useEffect(() => {
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => video.current?.focus());
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'Tab' && box.current) {
        const items = [...box.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
        const first = items[0];
        const last = items[items.length - 1];
        if (!first || !last) {
          return;
        }
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="experience experience--programme experience--gallery fixed inset-0 z-[90] grid place-items-center p-3 md:p-8"
      dir={locale === 'he' ? 'rtl' : 'ltr'}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label={close}
        onClick={onClose}
        className="absolute inset-0 bg-[rgb(4_14_8/0.86)] backdrop-blur-sm"
      />
      <div ref={box} role="dialog" aria-modal="true" aria-label={title} className="relative w-full max-w-5xl">
        <div className="mb-3 flex items-center justify-between gap-4 text-[var(--x-on-forest)]">
          <p className="truncate font-display text-lg font-bold">{title}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label={close}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-[rgb(255_255_255/0.12)] transition-colors hover:bg-[rgb(255_255_255/0.22)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--x-sand)]"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <video
          ref={video}
          controls
          autoPlay
          playsInline
          preload="auto"
          poster={entry.poster?.url}
          aria-label={title}
          className="block aspect-video max-h-[78vh] w-full rounded-[var(--x-r-card)] bg-[rgb(0_0_0)] object-contain shadow-[0_30px_80px_rgb(0_0_0/0.5)]"
        >
          <source src={entry.file.url} type={entry.file.mimeType} />
        </video>
      </div>
    </div>,
    document.body,
  );
};

const GalleryFilm = ({ entry, locale }: { entry: GalleryEntry; locale: Locale }) => {
  const [playing, setPlaying] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const words = GALLERY_COPY.film;
  const title = entry.title ?? words.title[locale];
  const lede = entry.caption ?? words.lede[locale];
  const duration = formatDuration(entry.durationSeconds);

  const stop = useCallback(() => {
    setPlaying(false);
    requestAnimationFrame(() => opener.current?.focus());
  }, []);

  return (
    <section aria-labelledby="gallery-film-title" className="mx-auto max-w-6xl px-4 md:px-8">
      <div className="relative isolate overflow-hidden rounded-[1.75rem] bg-[var(--x-forest)] text-[var(--x-on-forest)] shadow-[0_18px_50px_rgb(11_58_29/0.22)]">
        <OliveBranch className="pointer-events-none absolute -bottom-14 -start-10 -z-10 size-56 text-[var(--x-on-forest)] opacity-[0.07] md:size-72" />
        <OliveBranch className="pointer-events-none absolute -end-12 -top-16 -z-10 hidden size-52 rotate-180 text-[var(--x-sand)] opacity-[0.12] md:block" />
        <div className="grid items-center gap-5 p-4 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-10 md:p-8 lg:gap-14 lg:p-10">
          <button
            ref={opener}
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={`${GALLERY_COPY.play[locale]}: ${title}`}
            className="group relative block overflow-hidden rounded-[var(--x-r-card)] ring-1 ring-[var(--x-sand)]/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--x-sand)] md:order-2"
          >
            <span className="relative block aspect-video md:aspect-[21/10]">
              <span className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100 [&_img]:h-full [&_img]:object-cover [&>*]:h-full">
                <FilmStill entry={entry} sizes="(min-width: 1152px) 600px, (min-width: 768px) 55vw, 100vw" />
              </span>
              <span aria-hidden="true" className="absolute inset-0 bg-[rgb(0_0_0/0.14)] transition-colors group-hover:bg-[rgb(0_0_0/0.04)]" />
              <PlayMark size="lg" duration={entry.durationSeconds} />
            </span>
          </button>

          <div className="px-2 pb-3 text-center md:order-1 md:px-0 md:pb-0 md:text-start">
            <h2 id="gallery-film-title" className="font-display text-2xl font-bold leading-tight md:text-3xl lg:text-4xl">
              {title}
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-base leading-relaxed text-[var(--x-on-forest-soft)] md:mx-0">{lede}</p>
            <button
              type="button"
              onClick={() => setPlaying(true)}
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-[var(--x-r-pill)] bg-[var(--x-sand)] px-6 text-sm font-bold text-[var(--x-forest)] shadow-[0_6px_18px_rgb(0_0_0/0.18)] transition-transform hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--x-sand)] motion-reduce:transition-none md:mt-6"
            >
              {PLAY_ICON}
              {words.watch[locale]}
              {duration ? (
                <span className="sr-only">
                  {' '}
                  ({words.duration[locale]} {duration})
                </span>
              ) : null}
            </button>
          </div>
        </div>
      </div>

      {playing ? <FilmPlayer entry={entry} title={title} locale={locale} onClose={stop} /> : null}
    </section>
  );
};

export default GalleryFilm;
