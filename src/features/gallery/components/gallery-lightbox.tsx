'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import type { Locale } from '@/config/locales';
import { IconChevronLeft, IconChevronRight, IconClose } from '@/features/conference';
import { GALLERY_CATEGORY_LABELS, GALLERY_COPY, fill } from '../constants/gallery-copy';
import type { GalleryEntry } from '../types/gallery';

/*
 * The full-screen viewer.
 *
 * A dialog in the proper sense: it takes the focus when it opens (onto
 * its close button), keeps Tab inside itself, gives the focus back to
 * the tile that opened it, and locks the page behind it. Escape closes;
 * the arrow keys and a swipe move — in the reading direction, so on a
 * Hebrew page "next" is the left arrow and a swipe to the right, as a
 * Hebrew reader turns a page.
 */
interface GalleryLightboxProps {
  locale: Locale;
  entries: GalleryEntry[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
}

const FOCUSABLE = 'button:not([disabled]), [href], video[controls], [tabindex]:not([tabindex="-1"])';

const GalleryLightbox = ({ locale, entries, index, onIndex, onClose }: GalleryLightboxProps) => {
  const dialog = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const opener = useRef<Element | null>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const rtl = locale === 'he';
  const entry = entries[index];
  const count = entries.length;
  const words = GALLERY_COPY.lightbox;

  const go = useCallback(
    (step: 1 | -1) => {
      if (count > 1) {
        onIndex((index + step + count) % count);
      }
    },
    [count, index, onIndex],
  );

  /* Take the focus, lock the page, and give both back on the way out. */
  useEffect(() => {
    opener.current = document.activeElement;
    closeButton.current?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      if (opener.current instanceof HTMLElement) {
        opener.current.focus();
      }
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        /* Not while a film's own controls are being worked with the keys. */
        if (event.target instanceof HTMLVideoElement) {
          return;
        }
        event.preventDefault();
        const forward = event.key === (rtl ? 'ArrowLeft' : 'ArrowRight');
        go(forward ? 1 : -1);
        return;
      }
      if (event.key === 'Tab' && dialog.current) {
        const items = [...dialog.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
        if (items.length === 0) {
          return;
        }
        const first = items[0]!;
        const last = items[items.length - 1]!;
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
    return () => document.removeEventListener('keydown', onKey);
  }, [go, onClose, rtl]);

  const onPointerDown = (event: ReactPointerEvent) => {
    if (event.pointerType !== 'mouse') {
      swipe.current = { x: event.clientX, y: event.clientY };
    }
  };
  const onPointerUp = (event: ReactPointerEvent) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start) {
      return;
    }
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.2) {
      return;
    }
    /* Left-to-right: a swipe leftwards brings the next. Right-to-left: the mirror. */
    const forward = rtl ? dx > 0 : dx < 0;
    go(forward ? 1 : -1);
  };

  if (!entry) {
    return null;
  }

  const heading = entry.title ?? entry.alt;
  const category = entry.category ? GALLERY_CATEGORY_LABELS[entry.category][locale] : '';

  return (
    <div
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-label={words.label[locale]}
      dir={rtl ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-[80] flex flex-col bg-[rgb(6_20_11/0.94)] text-[var(--x-on-forest)]"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6">
        <p className="text-sm tabular-nums text-[var(--x-on-forest-soft)]" aria-live="polite">
          {fill(words.position[locale], { i: index + 1, n: count })}
        </p>
        <button
          ref={closeButton}
          type="button"
          onClick={onClose}
          aria-label={words.close[locale]}
          className="grid size-11 place-items-center rounded-full border border-[rgb(255_255_255/0.25)] transition-colors hover:bg-[rgb(255_255_255/0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--x-sand)]"
        >
          <IconClose className="size-5" />
        </button>
      </div>

      <div
        className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center px-2 md:px-20"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          swipe.current = null;
        }}
      >
        {entry.kind === 'video' ? (
          <video
            key={entry.id}
            controls
            autoPlay
            playsInline
            preload="metadata"
            poster={entry.poster?.url}
            aria-label={heading}
            className="max-h-full max-w-full rounded-[var(--nt-r-md)] bg-[rgb(0_0_0)]"
          >
            <source src={entry.file.url} type={entry.file.mimeType} />
          </video>
        ) : (
          <div key={entry.id} className="relative h-full w-full">
            <Image src={entry.file.url} alt={entry.alt} fill sizes="100vw" priority className="object-contain" />
          </div>
        )}

        {count > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label={words.previous[locale]}
              className="absolute start-2 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-[rgb(0_0_0/0.35)] transition-colors hover:bg-[rgb(0_0_0/0.55)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--x-sand)] md:start-5"
            >
              <IconChevronRight className="size-6 ltr:-scale-x-100" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label={words.next[locale]}
              className="absolute end-2 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-[rgb(0_0_0/0.35)] transition-colors hover:bg-[rgb(0_0_0/0.55)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--x-sand)] md:end-5"
            >
              <IconChevronLeft className="size-6 ltr:-scale-x-100" />
            </button>
          </>
        ) : null}
      </div>

      <div className="mx-auto w-full max-w-3xl px-5 pb-6 pt-3 text-center">
        {category ? (
          <p className="text-xs font-semibold tracking-[0.12em] text-[var(--x-sand)]">{category}</p>
        ) : null}
        {entry.title ? <h2 className="mt-1 font-display text-lg font-bold md:text-xl">{entry.title}</h2> : null}
        {entry.caption ? (
          <p className="mt-1 text-sm leading-relaxed text-[var(--x-on-forest-soft)]">{entry.caption}</p>
        ) : null}
        {entry.credit ? (
          <p className="mt-2 text-xs text-[var(--x-on-forest-soft)]">
            {words.credit[locale]}: <span dir="auto">{entry.credit}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default GalleryLightbox;
