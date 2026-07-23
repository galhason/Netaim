'use client';

import { motion } from 'motion/react';
import type { Locale } from '@/config/locales';
import { formatSessionTime, sceneItem } from '@/features/experience';
import type { AttendeeDayMoment } from '../types/attendee-experience';

interface DayMomentProps {
  moment: AttendeeDayMoment;
  savedLabel: string;
  locale: Locale;
}

const DayMoment = ({ moment, savedLabel, locale }: DayMomentProps) => {
  const start = formatSessionTime(moment.startTime, locale);
  const end = formatSessionTime(moment.endTime, locale);
  const isBreak = moment.kind === 'break';

  return (
    <motion.article
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.35 }}
      variants={sceneItem}
      className="grid gap-3 py-8 md:grid-cols-12 md:gap-10"
    >
      <div className="flex items-baseline gap-3 md:col-span-3 md:flex-col md:gap-1">
        {start ? (
          <p
            className={`font-display font-medium tabular-nums ${
              isBreak ? 'text-2xl md:text-3xl' : 'text-3xl md:text-4xl'
            }`}
          >
            <time dateTime={moment.startTime}>{start}</time>
          </p>
        ) : null}
        {end ? (
          <p className="text-sm text-text-secondary">
            <time dateTime={moment.endTime}>{end}</time>
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-2 md:col-span-8">
        <h3
          className={`font-display font-medium ${
            isBreak
              ? 'text-lg text-text-secondary md:text-xl'
              : 'text-xl md:text-2xl'
          }`}
        >
          {moment.saved ? (
            <span className="me-2.5 inline-flex align-middle" aria-hidden="true">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
          ) : null}
          {moment.title}
          {moment.saved ? <span className="sr-only"> — {savedLabel}</span> : null}
        </h3>
        {moment.description ? (
          <p className="max-w-prose leading-relaxed text-text-secondary">
            {moment.description}
          </p>
        ) : null}
        {moment.room || moment.note ? (
          <p className="text-sm text-text-secondary opacity-80">
            {[moment.room, moment.note].filter(Boolean).join(' · ')}
          </p>
        ) : null}
      </div>
    </motion.article>
  );
};

export default DayMoment;
