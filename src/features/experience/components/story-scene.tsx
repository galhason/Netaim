'use client';

import { motion, MotionConfig } from 'motion/react';
import type { SceneComponentProps } from '@/experience-engine';
import type { StoryContent } from '../types/scene-content';
import SceneHeader from './common/scene-header';
import StoryNarrative from './story/story-narrative';
import StoryImage from './story/story-image';
import StoryQuote from './story/story-quote';
import StoryNumbers from './story/story-numbers';
import StoryCta from './story/story-cta';
import { sceneSequence } from '../utils/scene-motion';

const StoryScene = ({ scene }: SceneComponentProps<StoryContent>) => {
  const { content } = scene;
  const hasImage = Boolean(content.image);

  return (
    <MotionConfig reducedMotion="user">
      <section
        aria-label={scene.title}
        className="bg-surface text-text-primary"
      >
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={sceneSequence}
          className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-24 pt-16 md:gap-14 md:px-12 md:pb-32 md:pt-20"
        >
          <SceneHeader label={content.label} heading={content.heading} />
          {hasImage && content.image ? (
            <div className="grid gap-8 md:grid-cols-12 md:items-stretch md:gap-12">
              <div className="md:order-2 md:col-span-7">
                <StoryImage image={content.image} />
              </div>
              <div className="flex flex-col justify-center gap-8 md:order-1 md:col-span-5">
                <StoryNarrative paragraphs={content.paragraphs} />
                {content.quote ? (
                  <StoryQuote
                    text={content.quote.text}
                    attribution={content.quote.attribution}
                  />
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              <StoryNarrative paragraphs={content.paragraphs} />
              {content.quote ? (
                <StoryQuote
                  text={content.quote.text}
                  attribution={content.quote.attribution}
                />
              ) : null}
            </div>
          )}
          {content.keyNumbers && content.keyNumbers.length > 0 ? (
            <StoryNumbers numbers={content.keyNumbers} />
          ) : null}
          {content.cta ? <StoryCta cta={content.cta} /> : null}
        </motion.div>
      </section>
    </MotionConfig>
  );
};

export default StoryScene;
