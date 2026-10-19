'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

/*
 * A rail of chips that can be longer than the screen.
 *
 * The organisation filter used to be a strip that scrolled sideways
 * with its scrollbar hidden: a finger could drag it, a mouse could
 * not, and whatever did not fit the first screen was simply out of
 * reach — a conference of forty organisations showed its first eight.
 * The strip still scrolls (a finger still drags it, a Tab still walks
 * it), and two arrows now stand at its ends for everyone else, each
 * shown only while there is more in its direction. The arrows move one
 * screen of chips at a time, and follow the page's direction, so "more"
 * is always towards the end of the list whichever way the text runs.
 *
 * Progressive: before the script runs there are no arrows, only the
 * strip, exactly as before.
 */
interface ChipRailProps {
  children: ReactNode;
  backLabel: string;
  forwardLabel: string;
}

const EDGE = 2;

const Chevron = ({ forward }: { forward: boolean }) => (
  <svg
    viewBox="0 0 20 20"
    aria-hidden="true"
    className={`size-4 ${forward ? 'rtl:-scale-x-100' : 'ltr:-scale-x-100'}`}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m7.5 4.5 5.5 5.5-5.5 5.5" />
  </svg>
);

const ChipRail = ({ children, backLabel, forwardLabel }: ChipRailProps) => {
  const rail = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ back: false, forward: false });

  const measure = useCallback(() => {
    const el = rail.current;
    if (!el) return;
    const travelled = Math.abs(el.scrollLeft);
    const room = el.scrollWidth - el.clientWidth;
    setEdges({ back: travelled > EDGE, forward: room - travelled > EDGE });
  }, []);

  useEffect(() => {
    measure();
    const el = rail.current;
    if (!el) return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);
    return () => observer.disconnect();
  }, [measure]);

  const move = (direction: 1 | -1) => {
    const el = rail.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === 'rtl';
    const step = Math.max(el.clientWidth - 80, 120);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: (rtl ? -direction : direction) * step, behavior: reduced ? 'auto' : 'smooth' });
  };

  const arrow =
    'absolute top-1/2 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-full border border-[var(--n-hair)] bg-white text-[var(--n-purple)] shadow-[0_2px_10px_rgba(0,0,0,0.08)] transition-opacity hover:border-[var(--n-purple)]/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--n-purple)]';

  return (
    <div className="relative -mx-4">
      {edges.back ? (
        <>
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 start-0 z-[5] w-12 bg-[linear-gradient(to_right,var(--n-bg),transparent)] rtl:bg-[linear-gradient(to_left,var(--n-bg),transparent)]" />
          <button type="button" onClick={() => move(-1)} aria-label={backLabel} className={`${arrow} start-1`}>
            <Chevron forward={false} />
          </button>
        </>
      ) : null}
      <div
        ref={rail}
        onScroll={measure}
        className="flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      {edges.forward ? (
        <>
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 end-0 z-[5] w-12 bg-[linear-gradient(to_left,var(--n-bg),transparent)] rtl:bg-[linear-gradient(to_right,var(--n-bg),transparent)]" />
          <button type="button" onClick={() => move(1)} aria-label={forwardLabel} className={`${arrow} end-1`}>
            <Chevron forward />
          </button>
        </>
      ) : null}
    </div>
  );
};

export default ChipRail;
