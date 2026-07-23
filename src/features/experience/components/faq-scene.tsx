'use client';

import { motion, MotionConfig } from 'motion/react';
import type { SceneComponentProps } from '@/experience-engine';
import type { FaqContent } from '../types/scene-content';
import SceneHeader from './common/scene-header';
import { sceneItem, sceneSequence } from '../utils/scene-motion';

const FaqScene = ({ scene }: SceneComponentProps<FaqContent>) => {
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
          viewport={{ once: true, amount: 0.25 }}
          variants={sceneSequence}
          className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-20 md:py-24"
        >
          <SceneHeader label={content.label} heading={content.heading} />
          <motion.div variants={sceneItem} className="flex flex-col">
            {content.items.map((item) => (
              <details
                key={item.id}
                className="group border-b border-border py-5"
              >
                <summary className="cursor-pointer list-none font-medium marker:content-none">
                  {item.question}
                </summary>
                <p className="max-w-prose pt-3 leading-relaxed text-text-secondary">
                  {item.answer}
                </p>
              </details>
            ))}
          </motion.div>
        </motion.div>
      </section>
    </MotionConfig>
  );
};

export default FaqScene;
