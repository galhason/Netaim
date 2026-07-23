'use client';

import { motion } from 'motion/react';
import type { Locale } from '@/config/locales';
import type { AgendaContent } from '../../types/scene-content';
import { sceneItem } from '../../utils/scene-motion';
import AgendaMoment from './agenda-moment';

type AgendaDayData = AgendaContent['days'][number];

interface AgendaDayProps {
  day: AgendaDayData;
  locale: Locale;
}

const AgendaDay = ({ day, locale }: AgendaDayProps) => (
  <div className="flex flex-col gap-4">
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.6 }}
      variants={sceneItem}
      className="flex flex-col gap-3"
    >
      <span aria-hidden="true" className="block h-px w-10 bg-accent" />
      <h3 className="font-display text-2xl font-medium md:text-3xl">
        {day.label}
      </h3>
    </motion.div>
    <div className="flex flex-col divide-y divide-border border-s border-border ps-6 md:ps-10">
      {day.sessions.map((session) => (
        <AgendaMoment key={session.id} session={session} locale={locale} />
      ))}
    </div>
  </div>
);

export default AgendaDay;
