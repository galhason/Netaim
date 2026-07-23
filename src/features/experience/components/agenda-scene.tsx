'use client';

import { motion, MotionConfig } from 'motion/react';
import type { SceneComponentProps } from '@/experience-engine';
import type { AgendaContent } from '../types/scene-content';
import SceneHeader from './common/scene-header';
import AgendaDay from './agenda/agenda-day';
import { sceneItem, sceneSequence } from '../utils/scene-motion';

const AgendaScene = ({
  scene,
  context,
}: SceneComponentProps<AgendaContent>) => {
  const { content } = scene;

  return (
    <MotionConfig reducedMotion="user">
      <section
        aria-label={scene.title}
        className="bg-surface text-text-primary"
      >
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-24 pt-16 md:gap-14 md:px-12 md:pb-32 md:pt-20">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            variants={sceneSequence}
            className="flex flex-col gap-5"
          >
            <SceneHeader label={content.label} heading={content.heading} />
            {content.intro ? (
              <motion.p
                variants={sceneItem}
                className="max-w-prose text-base leading-relaxed text-text-secondary md:text-lg"
              >
                {content.intro}
              </motion.p>
            ) : null}
          </motion.div>
          <div className="flex flex-col gap-12 md:gap-16">
            {content.days.map((day) => (
              <AgendaDay key={day.id} day={day} locale={context.locale} />
            ))}
          </div>
        </div>
      </section>
    </MotionConfig>
  );
};

export default AgendaScene;
