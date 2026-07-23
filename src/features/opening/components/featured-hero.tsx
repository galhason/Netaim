'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import type { Locale } from '@/config/locales';
import { RevealText } from '@/shared';
import { OPENING_UI } from '../constants/opening-content';
import type { FeaturedHero as FeaturedHeroData } from '../types/opening';
import { IconChevron } from './icons';

interface FeaturedHeroProps {
  featured: FeaturedHeroData;
  locale: Locale;
}

/*
 * Scene 01 — the featured event. The entrance always presents the most
 * important conference happening now: its artwork, its light, its words.
 * The frame is pinned for almost two viewport heights — the visitor is
 * given time — while the camera drifts and the content dissolves as the
 * journey hands over to the portal wall. Editors only choose the
 * featured event; everything here follows it.
 */
const FeaturedHero = ({ featured, locale }: FeaturedHeroProps) => {
  const ref = useRef<HTMLElement | null>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });
  const still = reduce === true;
  const contentOpacity = useTransform(
    scrollYProgress,
    [0, 0.5, 0.85],
    still ? [1, 1, 1] : [1, 1, 0],
  );
  const contentY = useTransform(
    scrollYProgress,
    [0, 0.85],
    still ? ['0%', '0%'] : ['0%', '-12%'],
  );

  return (
    <section ref={ref} className="relative h-[170vh]">
      <div className="sticky top-0 flex h-dvh flex-col overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="cine-slow-zoom absolute inset-0">
            <Image
              src={featured.image}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          </div>
          <div className="cine-image-scrim absolute inset-0" />
          <div className="cine-audience absolute inset-0" />
          <div className="cine-vignette absolute inset-0" />
        </div>
        <motion.div
          style={{ opacity: contentOpacity, y: contentY }}
          className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 md:px-12"
        >
          <p className="cine-hero-line text-xs font-medium tracking-[0.32em] text-accent md:text-sm">
            {[featured.dateLabel, featured.location].filter(Boolean).join(' · ')}
          </p>
          <RevealText
            as="h1"
            trigger="mount"
            delay={0.6}
            text={featured.title}
            className="mt-6 block max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl"
          />
          <p className="cine-hero-line mt-7 max-w-md text-lg leading-relaxed text-text-secondary [animation-delay:1800ms] md:text-xl">
            {featured.teaser}
          </p>
          <div className="cine-hero-line mt-10 flex flex-wrap items-center gap-x-8 gap-y-4 [animation-delay:2600ms]">
            <Link
              href={featured.href}
              className="inline-flex min-h-12 items-center gap-3 rounded-full bg-brand px-8 font-medium text-brand-contrast transition-transform delay-75 hover:scale-[1.02]"
            >
              {OPENING_UI.enterEvent[locale]}
              <IconChevron className="size-4 ltr:rotate-180" />
            </Link>
            <a
              href="#why"
              className="text-sm font-medium tracking-wide text-text-secondary transition-colors delay-75 hover:text-text-primary"
            >
              {OPENING_UI.watchStory[locale]}
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturedHero;
