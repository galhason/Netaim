'use client';

import Image from 'next/image';
import { motion, MotionConfig } from 'motion/react';
import type { SceneComponentProps } from '@/experience-engine';
import type { VenueContent } from '../types/scene-content';
import SceneHeader from './common/scene-header';
import VenueDetails from './venue/venue-details';
import { sceneItem, sceneSequence } from '../utils/scene-motion';

const VenueScene = ({ scene }: SceneComponentProps<VenueContent>) => {
  const { content } = scene;

  return (
    <MotionConfig reducedMotion="user">
      <section
        aria-label={scene.title}
        className="bg-surface text-text-primary"
      >
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={sceneSequence}
          className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-6 pb-12 pt-20 md:px-12 md:pb-14 md:pt-24"
        >
          <SceneHeader label={content.label} heading={content.heading} />
          {content.description ? (
            <motion.p
              variants={sceneItem}
              className="max-w-prose text-base leading-relaxed text-text-secondary md:text-lg"
            >
              {content.description}
            </motion.p>
          ) : null}
        </motion.div>
        {content.image ? (
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            variants={sceneItem}
            className="relative aspect-[16/9] w-full overflow-hidden md:aspect-[21/9]"
          >
            <Image
              src={content.image.url}
              alt={content.image.alt ?? content.name}
              fill
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-t from-scrim/75 via-transparent to-transparent" />
            <div className="absolute inset-x-0 bottom-0">
              <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-6 pb-8 text-on-media md:px-12">
                <p className="font-display text-3xl font-medium md:text-4xl">
                  {content.name}
                </p>
                <p className="text-sm opacity-85">{content.address}</p>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-6 md:px-12">
            <p className="font-display text-3xl font-medium md:text-4xl">
              {content.name}
            </p>
            <p className="text-sm text-text-secondary">{content.address}</p>
          </div>
        )}
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-24 pt-12 md:px-12 md:pb-32 md:pt-14">
          {content.details && content.details.length > 0 ? (
            <VenueDetails details={content.details} />
          ) : null}
          {content.mapUrl && content.mapLabel ? (
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.6 }}
              variants={sceneItem}
            >
              <a
                href={content.mapUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 items-center font-medium underline decoration-current/40 underline-offset-8 transition-colors hover:decoration-current"
              >
                {content.mapLabel}
              </a>
            </motion.div>
          ) : null}
        </div>
      </section>
    </MotionConfig>
  );
};

export default VenueScene;
