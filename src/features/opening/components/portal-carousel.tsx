'use client';

import { useEffect, useRef, type KeyboardEvent } from 'react';
import type { PortalPoster } from '../types/opening';
import PortalCard from './portal-card';
import { IconChevron } from './icons';

/*
 * A cinematic horizontal wall, not a grid: native momentum scrolling
 * with snap points carries the weight; the wheel, arrow keys and the
 * two quiet controls all drive the same scroller, direction-aware for
 * RTL. Posters load lazily as the wall moves.
 */
const WHEEL_FACTOR = 1.1;
const CARD_STEP_RATIO = 0.8;

interface PortalCarouselProps {
  posters: PortalPoster[];
  cta: string;
  prevLabel: string;
  nextLabel: string;
}

const PortalCarousel = ({
  posters,
  cta,
  prevLabel,
  nextLabel,
}: PortalCarouselProps) => {
  const scrollerRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }
    const forward = getComputedStyle(scroller).direction === 'rtl' ? -1 : 1;
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
        return;
      }
      event.preventDefault();
      scroller.scrollBy({ left: event.deltaY * WHEEL_FACTOR * forward });
    };
    scroller.addEventListener('wheel', onWheel, { passive: false });
    return () => scroller.removeEventListener('wheel', onWheel);
  }, []);

  const step = (direction: 1 | -1) => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }
    const forward = getComputedStyle(scroller).direction === 'rtl' ? -1 : 1;
    scroller.scrollBy({
      left: direction * forward * scroller.clientWidth * CARD_STEP_RATIO,
      behavior: 'smooth',
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return;
    }
    event.preventDefault();
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }
    scroller.scrollBy({
      left: (event.key === 'ArrowLeft' ? -1 : 1) * scroller.clientWidth * 0.5,
      behavior: 'smooth',
    });
  };

  return (
    <div className="relative">
      <ul
        ref={scrollerRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="flex snap-x snap-mandatory items-end gap-4 overflow-x-auto px-6 pb-4 [scrollbar-width:none] md:px-12 [&::-webkit-scrollbar]:hidden"
      >
        {posters.map((poster) => (
          <li
            key={poster.slug ?? poster.title}
            className={`shrink-0 snap-start ${
              poster.featured
                ? 'w-[88vw] sm:w-[50vw] lg:w-[27.5vw]'
                : 'w-[78vw] sm:w-[42vw] lg:w-[23vw]'
            }`}
          >
            <PortalCard poster={poster} cta={cta} />
          </li>
        ))}
      </ul>
      <button
        type="button"
        aria-label={prevLabel}
        onClick={() => step(-1)}
        className="absolute start-3 top-1/2 z-10 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-border-strong bg-surface/70 text-text-secondary backdrop-blur-sm transition-colors delay-75 hover:border-accent hover:text-accent md:flex"
      >
        <IconChevron className="size-4 rtl:rotate-180" />
      </button>
      <button
        type="button"
        aria-label={nextLabel}
        onClick={() => step(1)}
        className="absolute end-3 top-1/2 z-10 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-border-strong bg-surface/70 text-text-secondary backdrop-blur-sm transition-colors delay-75 hover:border-accent hover:text-accent md:flex"
      >
        <IconChevron className="size-4 ltr:rotate-180" />
      </button>
    </div>
  );
};

export default PortalCarousel;
