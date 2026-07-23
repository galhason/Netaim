'use client';

import { motion } from 'motion/react';
import {
  SceneHeader,
  SpeakerPortrait,
  sceneItem,
  sceneSequence,
} from '@/features/experience';
import type { AttendeeNetworking } from '../types/attendee-experience';

interface NetworkingSceneProps {
  networking: AttendeeNetworking;
}

const NetworkingScene = ({ networking }: NetworkingSceneProps) => (
  <section id="networking" className="bg-surface text-text-primary">
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 pb-20 pt-24 md:gap-16 md:px-12 md:pb-24 md:pt-28">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.5 }}
        variants={sceneSequence}
        className="flex flex-col gap-5"
      >
        <SceneHeader
          label={networking.label}
          heading={networking.heading}
          centered
        />
        {networking.intro ? (
          <motion.p
            variants={sceneItem}
            className="mx-auto max-w-prose text-center text-base leading-relaxed text-text-secondary md:text-lg"
          >
            {networking.intro}
          </motion.p>
        ) : null}
      </motion.div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-4 lg:gap-x-8">
        {networking.people.map((person, index) => (
          <div
            key={person.id}
            className={`flex flex-col gap-3 ${
              index % 2 === 1 ? 'lg:mt-12' : ''
            }`}
          >
            <SpeakerPortrait
              name={person.name}
              role={person.role}
              photoUrl={person.photoUrl}
              photoAlt={person.photoAlt}
            />
            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.5 }}
              variants={sceneItem}
              className="text-sm leading-relaxed text-text-secondary"
            >
              {person.reason}
            </motion.p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default NetworkingScene;
