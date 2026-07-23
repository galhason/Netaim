'use client';

import { motion, MotionConfig } from 'motion/react';
import type { SceneComponentProps } from '@/experience-engine';
import type { HeroContent as HeroContentData } from '../types/scene-content';
import HeroBackground from './hero/hero-background';
import HeroContent from './hero/hero-content';
import HeroActions from './hero/hero-actions';
import HeroMeta from './hero/hero-meta';
import HeroScrollHint from './hero/hero-scroll-hint';
import { heroSequence } from './hero/hero-motion';

const HeroScene = ({
  scene,
  context,
}: SceneComponentProps<HeroContentData>) => {
  const { content } = scene;
  const hasMedia = Boolean(content.backgroundImage);

  return (
    <MotionConfig reducedMotion="user">
      <section
        aria-label={scene.title}
        className={`relative isolate flex min-h-dvh flex-col overflow-hidden ${
          hasMedia ? 'text-on-media' : 'text-text-primary'
        }`}
      >
        <HeroBackground
          image={content.backgroundImage}
          video={content.backgroundVideo}
        />
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-end px-6 pb-16 pt-40 md:px-12">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={heroSequence}
            className="flex max-w-2xl flex-col items-start gap-6 text-start"
          >
            <HeroContent
              headline={content.headline}
              eyebrow={content.eyebrow}
              subheadline={content.subheadline}
              description={content.description}
              badge={content.badge}
            />
            <HeroMeta
              locale={context.locale}
              eventDate={content.eventDate}
              eventLocation={content.eventLocation}
            />
            <HeroActions
              primary={content.primaryCta}
              secondary={content.secondaryCta}
            />
          </motion.div>
        </div>
        <div
          aria-hidden="true"
          className="h-24 w-full bg-linear-to-b from-transparent to-surface"
        />
        <HeroScrollHint label={content.scrollHintLabel} />
      </section>
    </MotionConfig>
  );
};

export default HeroScene;
