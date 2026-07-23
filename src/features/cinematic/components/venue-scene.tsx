'use client';

import Image from 'next/image';
import { motion, useReducedMotion, type Variants } from 'motion/react';
import type { Locale } from '@/config/locales';
import type { VenueScene as VenueSceneData } from '../types/cinematic';
import { Glyph } from './icons';
import { RevealText } from '@/shared';

interface VenueSceneProps {
  venue: VenueSceneData;
  locale: Locale;
}

const EASE = [0.16, 1, 0.3, 1] as const;

const rows: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};

const rowItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

/*
 * Scene 07 — The place, as an elegant editorial pause: a compact
 * two-column spread — a cinematic portrait of the venue on one side, its
 * name, atmosphere and the practical answers woven into feature rows on
 * the other. Confident and quiet, never a second hero. From the CMS.
 */
const VenueScene = ({ venue, locale }: VenueSceneProps) => {
  const reduce = useReducedMotion();
  const facts = venue.facts.slice(0, 4);
  const subtitle = venue.subtitle
    ? venue.subtitle
        .split(/[,\u060C]/)
        .map((part) => part.trim())
        .filter((part) => part && part !== venue.name)
        .join(', ') || undefined
    : undefined;

  return (
    <section
      id="venue"
      className="relative overflow-hidden pt-12 pb-12 md:pt-14 md:pb-14"
    >
      {/* Soft bronze radial lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-2/3 bg-[radial-gradient(50%_50%_at_62%_50%,color-mix(in_srgb,var(--color-accent)_8%,transparent),transparent_72%)]"
      />

      <div className="relative mx-auto max-w-[1240px] px-6 md:px-12">
        <div className="grid items-center gap-10 lg:grid-cols-[62fr_38fr] lg:gap-12">
          {/* Content — physical right in he */}
          <motion.div
            initial={reduce ? false : { opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <p className="text-xs font-medium uppercase tracking-[0.34em] text-accent md:text-sm">
              {locale === 'he' ? 'המקום' : 'Venue'}
            </p>
            <RevealText
              as="h2"
              text={venue.name}
              className="mt-3 block font-display text-5xl font-extrabold tracking-tight md:text-6xl"
            />
            {subtitle ? (
              <p className="mt-2 text-lg text-accent/85 md:text-xl">
                {subtitle}
              </p>
            ) : null}
            <p className="mt-5 max-w-xl whitespace-pre-line text-base leading-relaxed text-text-secondary md:text-lg">
              {venue.narrative}
            </p>

            {/* Feature rows */}
            {facts.length > 0 ? (
              <motion.ul
                initial={reduce ? false : 'hidden'}
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                variants={rows}
                className="mt-7 flex flex-col gap-4"
              >
                {facts.map((fact) => (
                  <motion.li
                    key={fact.label}
                    variants={rowItem}
                    className="flex items-start gap-4"
                  >
                    <span className="grid size-9 flex-none place-items-center rounded-lg border border-accent/15 bg-accent/[0.07] text-accent">
                      <Glyph icon={fact.icon} className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-display text-base font-semibold text-text-primary md:text-lg">
                        {fact.label}
                      </p>
                      {fact.description ? (
                        <p className="mt-0.5 text-sm leading-relaxed text-text-secondary">
                          {fact.description}
                        </p>
                      ) : null}
                    </div>
                  </motion.li>
                ))}
              </motion.ul>
            ) : null}
          </motion.div>

          {/* Photograph — physical left in he */}
          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.9, ease: EASE }}
          >
            <div className="group relative aspect-[4/5] w-full overflow-hidden rounded-[28px] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.85)] ring-1 ring-accent/20">
              <Image
                src={venue.image}
                alt={venue.name}
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface/25 to-transparent"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default VenueScene;
