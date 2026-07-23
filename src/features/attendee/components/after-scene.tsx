'use client';

import { motion } from 'motion/react';
import {
  SceneHeader,
  sceneItem,
  sceneSequence,
  sceneThreshold,
} from '@/features/experience';
import type { AttendeeAfter } from '../types/attendee-experience';

interface AfterSceneProps {
  after: AttendeeAfter;
}

const AfterScene = ({ after }: AfterSceneProps) => (
  <section id="after" className="bg-surface text-text-primary">
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={sceneSequence}
      className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-24 md:py-36"
    >
      <motion.span
        variants={sceneThreshold}
        aria-hidden="true"
        className="block h-px w-16 origin-left bg-accent rtl:origin-right"
      />
      <SceneHeader label={after.label} heading={after.heading} />
      {after.text ? (
        <motion.p
          variants={sceneItem}
          className="max-w-prose leading-relaxed text-text-secondary md:text-lg"
        >
          {after.text}
        </motion.p>
      ) : null}
      {after.resources.length > 0 ? (
        <motion.ul variants={sceneItem} className="flex flex-col">
          {after.resources.map((resource) => (
            <li
              key={resource.id}
              className="flex flex-wrap items-baseline justify-between gap-2 border-t border-border py-5"
            >
              <span className="flex flex-col gap-0.5">
                <span className="text-xs tracking-widest text-text-secondary">
                  {resource.kindLabel}
                </span>
                {resource.href ? (
                  <a
                    href={resource.href}
                    className="inline-flex min-h-11 items-center font-medium underline decoration-current/40 underline-offset-8 transition-colors hover:decoration-current"
                  >
                    {resource.title}
                  </a>
                ) : (
                  <span className="font-medium">{resource.title}</span>
                )}
              </span>
              {!resource.href && resource.pendingNote ? (
                <span className="text-sm text-text-secondary">
                  {resource.pendingNote}
                </span>
              ) : null}
            </li>
          ))}
        </motion.ul>
      ) : null}
      {after.nextEventLine ? (
        <motion.p variants={sceneItem} className="text-sm text-text-secondary">
          {after.nextEventLine}
        </motion.p>
      ) : null}
    </motion.div>
  </section>
);

export default AfterScene;
