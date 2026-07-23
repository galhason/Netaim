'use client';

import Image from 'next/image';
import { motion } from 'motion/react';
import {
  SceneHeader,
  sceneItem,
  sceneSequence,
} from '@/features/experience';
import type { AttendeeMyEvent } from '../types/attendee-experience';

interface MyEventSceneProps {
  myEvent: AttendeeMyEvent;
}

const MyEventScene = ({ myEvent }: MyEventSceneProps) => (
  <section id="my-event" className="bg-surface text-text-primary">
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={sceneSequence}
      className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-24 pt-16 md:gap-12 md:px-12 md:pb-28 md:pt-20"
    >
      <SceneHeader label={myEvent.label} heading={myEvent.heading} />
      <div className="grid gap-8 md:grid-cols-12 md:items-stretch md:gap-12">
        {myEvent.image ? (
          <motion.div
            variants={sceneItem}
            className="relative -mx-6 aspect-[16/10] overflow-hidden md:order-2 md:col-span-7 md:mx-0 md:-me-12 md:aspect-auto"
          >
            <Image
              src={myEvent.image.url}
              alt={myEvent.image.alt ?? ''}
              fill
              sizes="(min-width: 768px) 60vw, 100vw"
              className="object-cover"
            />
          </motion.div>
        ) : null}
        <div className="flex flex-col justify-center gap-8 md:order-1 md:col-span-5">
          <motion.p
            variants={sceneItem}
            className="max-w-prose text-base leading-relaxed text-text-secondary md:text-lg"
          >
            {myEvent.summary}
          </motion.p>
          <motion.p variants={sceneItem} className="flex flex-col gap-1">
            <span className="text-xs tracking-widest text-text-secondary">
              {myEvent.statusLabel}
            </span>
            <span className="font-medium">{myEvent.statusValue}</span>
          </motion.p>
        </div>
      </div>
      {myEvent.updates.length > 0 ? (
        <motion.div variants={sceneItem} className="flex flex-col">
          {myEvent.updates.map((update) => (
            <article
              key={update.id}
              className="flex flex-col gap-1 border-t border-border py-5"
            >
              {update.dateLabel ? (
                <p className="text-xs tracking-widest text-text-secondary">
                  {update.dateLabel}
                </p>
              ) : null}
              <h3 className="font-medium">{update.title}</h3>
              <p className="max-w-prose text-sm leading-relaxed text-text-secondary">
                {update.text}
              </p>
            </article>
          ))}
        </motion.div>
      ) : null}
    </motion.div>
  </section>
);

export default MyEventScene;
