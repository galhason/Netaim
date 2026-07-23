'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from 'react';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from 'motion/react';
import { GUIDING_TONE_RGB } from '@/shared';
import type { PortalPoster } from '../types/opening';
import { IconChevron } from './icons';

/*
 * A portal, not a card: the artwork owns the frame, hover awakens the
 * world (camera push, warm light, dust, a bronze line), and click enters
 * it — the poster expands into darkness before navigation, so arriving
 * at the conference feels like crossing a threshold rather than loading
 * a page. Reduced motion collapses the ceremony to a plain navigation.
 */
const PARALLAX_RANGE = 5;
const ENTER_DURATION_MS = 700;

interface PortalCardProps {
  poster: PortalPoster;
  cta: string;
}

const PortalCard = ({ poster, cta }: PortalCardProps) => {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [entering, setEntering] = useState(false);
  const parallaxX = useMotionValue(0);
  const parallaxY = useMotionValue(0);
  const springX = useSpring(parallaxX, { stiffness: 50, damping: 16 });
  const springY = useSpring(parallaxY, { stiffness: 50, damping: 16 });

  const onMouseMove = (event: MouseEvent<HTMLElement>) => {
    if (reduce) {
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratioX = (event.clientX - bounds.left) / bounds.width - 0.5;
    const ratioY = (event.clientY - bounds.top) / bounds.height - 0.5;
    parallaxX.set(ratioX * PARALLAX_RANGE * 2);
    parallaxY.set(ratioY * PARALLAX_RANGE * 2);
  };

  const onMouseLeave = () => {
    parallaxX.set(0);
    parallaxY.set(0);
  };

  const enter = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!poster.href) {
      return;
    }
    if (reduce) {
      return;
    }
    event.preventDefault();
    if (entering) {
      return;
    }
    setEntering(true);
    const href = poster.href;
    window.setTimeout(() => router.push(href), ENTER_DURATION_MS);
  };

  const frame = (
    <div
      style={{ '--portal-tone': `rgb(${GUIDING_TONE_RGB[poster.tone]} / 0.22)` } as CSSProperties}
      className={`relative aspect-[2/3] overflow-hidden transition-transform delay-75 duration-700 ease-out group-hover:scale-[1.02] ${
        poster.featured
          ? 'shadow-[0_0_90px_-25px_rgba(201,161,93,0.5)]'
          : ''
      }`}
    >
      {!poster.href && poster.comingSoon ? (
        <span className="absolute end-4 top-4 z-10 inline-flex items-center rounded-full border border-accent/50 bg-surface/70 px-3.5 py-1.5 text-xs font-medium tracking-[0.18em] text-accent backdrop-blur-sm">
          {poster.comingSoon}
        </span>
      ) : null}
      <motion.div style={{ x: springX, y: springY }} className="absolute -inset-3">
        <Image
          src={poster.image}
          alt=""
          fill
          sizes="(max-width: 640px) 78vw, (max-width: 1024px) 42vw, 23vw"
          className="object-cover transition-transform delay-75 duration-[1400ms] ease-out group-hover:scale-[1.06]"
        />
      </motion.div>
      <div className="cine-image-scrim absolute inset-0" />
      <div className="absolute inset-0 bg-(--portal-tone) opacity-0 mix-blend-soft-light transition-opacity delay-75 duration-1000 group-hover:opacity-100" />
      <div className="cine-dust absolute inset-0 opacity-0 transition-opacity duration-1000 group-hover:opacity-60" />
      <div className="absolute inset-x-0 bottom-0 p-6 transition-transform duration-700 ease-out group-hover:-translate-y-1.5">
        <div className="mb-4 h-px w-10 origin-left scale-x-0 bg-accent transition-transform duration-700 rtl:origin-right group-hover:scale-x-100" />
        <p className="font-display text-2xl font-bold leading-tight tracking-tight md:text-3xl">
          {poster.title}
        </p>
        <p className="mt-2 text-sm text-text-secondary">
          {[poster.location, poster.dateLabel].filter(Boolean).join(' · ')}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary/90 opacity-0 transition-opacity delay-75 duration-700 group-hover:opacity-100 md:text-base">
          {poster.teaser}
        </p>
        {poster.href ? (
          <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-accent opacity-0 transition-opacity duration-700 group-hover:opacity-100">
            {cta}
            <IconChevron className="size-4 ltr:rotate-180" />
          </span>
        ) : null}
      </div>
    </div>
  );

  const overlay: ReactNode = entering ? (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: ENTER_DURATION_MS / 1000, ease: 'easeInOut' }}
      className="fixed inset-0 z-[80]"
    >
      <Image
        src={poster.image}
        alt=""
        fill
        sizes="100vw"
        className="scale-105 object-cover"
      />
      <div className="absolute inset-0 bg-surface/85" />
    </motion.div>
  ) : null;

  if (!poster.href) {
    return (
      <div
        className="group"
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
      >
        {frame}
      </div>
    );
  }

  return (
    <>
      <Link
        href={poster.href}
        onClick={enter}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        aria-label={`${poster.title} — ${[poster.location, poster.dateLabel]
          .filter(Boolean)
          .join(', ')}`}
        className="group block"
      >
        {frame}
      </Link>
      {overlay}
    </>
  );
};

export default PortalCard;
