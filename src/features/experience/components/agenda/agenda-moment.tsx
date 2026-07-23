'use client';

import { motion } from 'motion/react';
import type { Locale } from '@/config/locales';
import type { SessionItem } from '../../types/scene-content';
import { formatSessionTime } from '../../utils/format-session-time';
import { sceneItem } from '../../utils/scene-motion';

interface AgendaMomentProps {
  session: SessionItem;
  locale: Locale;
}

const AgendaMoment = ({ session, locale }: AgendaMomentProps) => {
  const start = formatSessionTime(session.startTime, locale);
  const end = formatSessionTime(session.endTime, locale);
  const place = [session.room, session.track].filter(Boolean).join(' · ');

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
          <p className="font-display text-3xl font-medium tabular-nums md:text-4xl">
            <time dateTime={session.startTime}>{start}</time>
          </p>
        ) : null}
        {end ? (
          <p className="text-sm text-text-secondary">
            <time dateTime={session.endTime}>{end}</time>
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-2 md:col-span-8">
        <h4 className="font-display text-xl font-medium md:text-2xl">
          {session.title}
        </h4>
        {session.description ? (
          <p className="max-w-prose leading-relaxed text-text-secondary">
            {session.description}
          </p>
        ) : null}
        {place ? (
          <p className="text-sm text-text-secondary opacity-80">{place}</p>
        ) : null}
      </div>
    </motion.article>
  );
};

export default AgendaMoment;
