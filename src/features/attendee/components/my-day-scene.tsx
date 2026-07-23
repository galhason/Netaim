'use client';

import { motion } from 'motion/react';
import type { Locale } from '@/config/locales';
import {
  SceneHeader,
  sceneItem,
  sceneSequence,
} from '@/features/experience';
import type { AttendeeMyDay } from '../types/attendee-experience';
import DayMoment from './day-moment';

interface MyDaySceneProps {
  myDay: AttendeeMyDay;
  locale: Locale;
}

const MyDayScene = ({ myDay, locale }: MyDaySceneProps) => (
  <section id="my-day" className="bg-surface text-text-primary">
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-24 pt-16 md:gap-12 md:px-12 md:pb-28 md:pt-20">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.4 }}
        variants={sceneSequence}
        className="flex flex-col gap-5"
      >
        <SceneHeader label={myDay.label} heading={myDay.heading} />
        {myDay.intro ? (
          <motion.p
            variants={sceneItem}
            className="max-w-prose text-base leading-relaxed text-text-secondary md:text-lg"
          >
            {myDay.intro}
          </motion.p>
        ) : null}
      </motion.div>
      <div className="flex flex-col divide-y divide-border border-s border-border ps-6 md:ps-10">
        {myDay.moments.map((moment) => (
          <DayMoment
            key={moment.id}
            moment={moment}
            savedLabel={myDay.savedLabel}
            locale={locale}
          />
        ))}
      </div>
    </div>
  </section>
);

export default MyDayScene;
