'use client';

import { motion } from 'motion/react';
import { Calendar, MapPin } from 'lucide-react';
import { Icon } from '@/shared';
import type { Locale } from '@/config/locales';
import { heroItem } from './hero-motion';

interface HeroMetaProps {
  locale: Locale;
  eventDate?: string;
  eventLocation?: string;
}

const HeroMeta = ({ locale, eventDate, eventLocation }: HeroMetaProps) => {
  const parsed = eventDate ? Date.parse(eventDate) : Number.NaN;
  const formattedDate = Number.isNaN(parsed)
    ? null
    : new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(parsed);

  if (!formattedDate && !eventLocation) {
    return null;
  }

  return (
    <motion.div
      variants={heroItem}
      className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm opacity-90"
    >
      {formattedDate && eventDate ? (
        <span className="flex items-center gap-2">
          <span className="text-accent">
            <Icon icon={Calendar} />
          </span>
          <time dateTime={eventDate}>{formattedDate}</time>
        </span>
      ) : null}
      {formattedDate && eventLocation ? (
        <span aria-hidden="true" className="opacity-40">
          |
        </span>
      ) : null}
      {eventLocation ? (
        <span className="flex items-center gap-2">
          <span className="text-accent">
            <Icon icon={MapPin} />
          </span>
          <span>{eventLocation}</span>
        </span>
      ) : null}
    </motion.div>
  );
};

export default HeroMeta;
