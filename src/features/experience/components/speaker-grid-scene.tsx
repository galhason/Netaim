'use client';

import { motion, MotionConfig } from 'motion/react';
import type { SceneComponentProps } from '@/experience-engine';
import type { SpeakerGridContent } from '../types/scene-content';
import SceneHeader from './common/scene-header';
import SpeakerPortrait from './people/speaker-portrait';
import { sceneItem, sceneSequence } from '../utils/scene-motion';

const SpeakerGridScene = ({
  scene,
}: SceneComponentProps<SpeakerGridContent>) => {
  const { content } = scene;

  return (
    <MotionConfig reducedMotion="user">
      <section
        aria-label={scene.title}
        className="bg-surface text-text-primary"
      >
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 pb-20 pt-24 md:gap-16 md:px-12 md:pb-24 md:pt-32">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            variants={sceneSequence}
            className="flex flex-col gap-5"
          >
            <SceneHeader
              label={content.label}
              heading={content.heading}
              centered
            />
            {content.intro ? (
              <motion.p
                variants={sceneItem}
                className="mx-auto max-w-prose text-center text-base leading-relaxed text-text-secondary md:text-lg"
              >
                {content.intro}
              </motion.p>
            ) : null}
          </motion.div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4 lg:gap-x-8">
            {content.speakers.map((speaker, index) => (
              <div
                key={speaker.id}
                className={index % 2 === 1 ? 'lg:mt-12' : undefined}
              >
                <SpeakerPortrait
                  name={speaker.name}
                  role={speaker.role}
                  photoUrl={speaker.photoUrl}
                  photoAlt={speaker.photoAlt}
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    </MotionConfig>
  );
};

export default SpeakerGridScene;
