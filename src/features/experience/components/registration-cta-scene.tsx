'use client';

import { motion, MotionConfig } from 'motion/react';
import type { SceneComponentProps } from '@/experience-engine';
import type { RegistrationCtaContent } from '../types/scene-content';
import {
  sceneItem,
  sceneSequence,
  sceneThreshold,
} from '../utils/scene-motion';

const RegistrationCtaScene = ({
  scene,
}: SceneComponentProps<RegistrationCtaContent>) => {
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
          viewport={{ once: true, amount: 0.5 }}
          variants={sceneSequence}
          className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-6 py-24 text-center md:py-44"
        >
          <motion.span
            variants={sceneThreshold}
            aria-hidden="true"
            className="block h-px w-16 bg-accent"
          />
          {content.eyebrow ? (
            <motion.p
              variants={sceneItem}
              className="text-sm font-medium tracking-widest text-text-secondary"
            >
              {content.eyebrow}
            </motion.p>
          ) : null}
          {content.heading ? (
            <motion.h2
              variants={sceneItem}
              className="font-display text-4xl font-medium leading-tight tracking-tight text-balance md:text-6xl"
            >
              {content.heading}
            </motion.h2>
          ) : null}
          {content.text ? (
            <motion.p
              variants={sceneItem}
              className="max-w-prose leading-relaxed text-text-secondary md:text-lg"
            >
              {content.text}
            </motion.p>
          ) : null}
          <motion.div variants={sceneItem} className="pt-6">
            <motion.a
              href={content.href}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex min-h-14 items-center justify-center rounded-lg bg-brand px-10 text-lg font-medium text-brand-contrast"
            >
              {content.label}
            </motion.a>
          </motion.div>
          {content.note ? (
            <motion.p
              variants={sceneItem}
              className="text-xs tracking-wide text-text-secondary"
            >
              {content.note}
            </motion.p>
          ) : null}
        </motion.div>
      </section>
    </MotionConfig>
  );
};

export default RegistrationCtaScene;
