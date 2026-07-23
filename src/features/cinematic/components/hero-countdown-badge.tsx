'use client';

import { useEffect, useState } from 'react';
import type { Locale } from '@/config/locales';

interface HeroCountdownBadgeProps {
  startsAt?: string;
  endsAt?: string;
  locale: Locale;
}

const DAY_MS = 86_400_000;

/*
 * A small premium badge, computed live in the visitor's browser: how
 * many days until the conference opens, or that it is happening now, or
 * that it has ended. Fully automatic from the start date — no manual
 * editing, refreshed while the page is open. Renders nothing until it
 * has a date, so there is no server/client mismatch.
 */
const HeroCountdownBadge = ({
  startsAt,
  endsAt,
  locale,
}: HeroCountdownBadgeProps) => {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!startsAt) {
      setLabel(null);
      return;
    }
    const start = Date.parse(startsAt);
    if (Number.isNaN(start)) {
      setLabel(null);
      return;
    }
    const end = endsAt ? Date.parse(endsAt) : start + DAY_MS;

    const compute = () => {
      const now = Date.now();
      if (now < start) {
        const days = Math.max(1, Math.ceil((start - now) / DAY_MS));
        setLabel(
          locale === 'he'
            ? `הכנס מתחיל בעוד ${days} ${days === 1 ? 'יום' : 'ימים'}`
            : `Starts in ${days} ${days === 1 ? 'day' : 'days'}`,
        );
      } else if (!Number.isNaN(end) && now > end) {
        setLabel(locale === 'he' ? 'הכנס הסתיים' : 'The conference has ended');
      } else {
        setLabel(
          locale === 'he'
            ? 'הכנס מתקיים כעת'
            : 'The conference is happening now',
        );
      }
    };

    compute();
    const id = setInterval(compute, 60 * 60 * 1000);
    return () => clearInterval(id);
  }, [startsAt, endsAt, locale]);

  if (!label) {
    return null;
  }

  return (
    <div className="inline-flex items-center gap-2.5 rounded-full border border-accent/25 bg-accent/10 px-4 py-2 text-sm font-medium text-accent shadow-[0_0_34px_-10px_rgba(201,161,93,0.55)] backdrop-blur-sm">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent/60" />
        <span className="relative inline-flex size-2 rounded-full bg-accent" />
      </span>
      {label}
    </div>
  );
};

export default HeroCountdownBadge;
