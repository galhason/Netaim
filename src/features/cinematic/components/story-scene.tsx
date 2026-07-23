'use client';

import { motion, useReducedMotion, type Variants } from 'motion/react';
import type { ReactNode } from 'react';
import type { StoryScene as StorySceneData } from '../types/cinematic';
import { IconBulb, IconSprout, IconTarget, IconUsers } from './icons';
import { ParallaxImage, RevealText } from '@/shared';

interface StorySceneProps {
  story: StorySceneData;
  mirrored?: boolean;
}

const VALUE_ICONS: Record<
  string,
  (props: { className?: string }) => ReactNode
> = {
  network: IconUsers,
  innovation: IconBulb,
  knowledge: IconSprout,
  impact: IconTarget,
};

const EASE = [0.16, 1, 0.3, 1] as const;

const valuesContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.08 } },
};

const valueItem: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

/*
 * Scene 02 — About the conference, staged as one continuous editorial
 * spread that follows the hero without a seam. The words hold the
 * reading-start half; a large 16:10 photograph, lifted on a soft golden
 * light, dominates the other. The four reasons to be in the room sit
 * directly beneath the words as a weightless row parted by hairlines —
 * no cards, no borders. Everything is drawn from the CMS.
 */
const StoryScene = ({ story }: StorySceneProps) => {
  const values = story.values ?? [];
  const reduce = useReducedMotion();

  return (
    <section
      id="story"
      className="relative overflow-hidden pt-10 pb-8 md:pt-14 md:pb-12 lg:pt-16"
    >
      {/* Barely-there warm light, seated behind the photograph */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-3/5 bg-[radial-gradient(50%_50%_at_35%_50%,color-mix(in_srgb,var(--color-accent)_10%,transparent),transparent_72%)]"
      />

      <div className="relative mx-auto max-w-[1440px] px-6 md:px-12">
        <div className="grid items-center gap-12 lg:grid-cols-[55fr_45fr] lg:gap-20">
          {/* Words — physical left in he (reading start) */}
          <div>
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8, ease: EASE }}
            >
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-accent">
                {story.eyebrow}
              </p>
              <RevealText
                as="h2"
                text={story.title}
                className="mt-6 block max-w-xl font-display text-4xl font-bold leading-[1.12] tracking-tight md:text-5xl lg:text-6xl lg:leading-[1.08]"
              />
              <p className="mt-7 max-w-xl text-lg leading-relaxed text-text-secondary md:text-xl">
                {story.paragraph}
              </p>
            </motion.div>

            {values.length > 0 ? (
              <motion.ul
                initial={reduce ? false : 'hidden'}
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                variants={valuesContainer}
                className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 md:mt-14 sm:grid-cols-4 sm:gap-x-0"
              >
                {values.map((value, index) => {
                  const Icon = VALUE_ICONS[value.icon] ?? IconTarget;
                  return (
                    <motion.li
                      key={value.title}
                      variants={valueItem}
                      className={`flex flex-col items-start gap-3.5 ${
                        index > 0
                          ? 'sm:border-s sm:border-white/10 sm:ps-6'
                          : ''
                      }`}
                    >
                      <Icon className="size-7 text-accent" />
                      <p className="font-display text-base font-semibold leading-snug text-text-primary md:text-lg">
                        {value.title}
                      </p>
                      <p className="text-xs leading-snug text-text-secondary md:text-sm">
                        {value.subtitle}
                      </p>
                    </motion.li>
                  );
                })}
              </motion.ul>
            ) : null}
          </div>

          {/* Photograph — physical right in he, the section's visual anchor */}
          <motion.div
            className="lg:order-first"
            initial={reduce ? false : { opacity: 0, y: 28, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 1, ease: EASE }}
          >
            <div className="relative">
              {/* golden glow directly behind the frame */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-6 rounded-[2.5rem] bg-accent/12 blur-3xl"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-10 bg-[radial-gradient(55%_55%_at_50%_45%,color-mix(in_srgb,var(--color-accent)_18%,transparent),transparent_70%)] opacity-70 blur-2xl"
              />
              <div className="cine-float relative">
                <ParallaxImage
                  src={story.image}
                  sizes="(max-width: 1024px) 100vw, 55vw"
                  className="aspect-[16/10] w-full rounded-[1.75rem] shadow-[0_44px_120px_-30px_rgba(0,0,0,0.78)]"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default StoryScene;
