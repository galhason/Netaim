'use client';

import { useEffect, useState } from 'react';
import type { Locale } from '@/config/locales';
import { CINEMATIC_UI } from '../constants/cinematic-content';

interface HeroCountdownProps {
  startsAt?: string;
  locale: Locale;
}

interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const remainingUntil = (target: number): Remaining | null => {
  const distance = target - Date.now();
  if (distance <= 0) {
    return null;
  }
  return {
    days: Math.floor(distance / DAY),
    hours: Math.floor((distance % DAY) / HOUR),
    minutes: Math.floor((distance % HOUR) / MINUTE),
    seconds: Math.floor((distance % MINUTE) / SECOND),
  };
};

/*
 * The invitation's heartbeat (Experience Engine v3): a compact ticking
 * countdown living inside the hero's glass panel. Renders empty on the
 * server and wakes on the client so hydration never argues with the
 * clock; a past or missing date renders nothing at all.
 */
const HeroCountdown = ({ startsAt, locale }: HeroCountdownProps) => {
  const [remaining, setRemaining] = useState<Remaining | null>(null);
  const target = startsAt ? Date.parse(startsAt) : Number.NaN;

  useEffect(() => {
    if (Number.isNaN(target)) {
      return;
    }
    const tick = () => setRemaining(remainingUntil(target));
    tick();
    const interval = window.setInterval(tick, SECOND);
    return () => window.clearInterval(interval);
  }, [target]);

  if (!remaining) {
    return null;
  }

  const units = [
    { value: remaining.days, label: CINEMATIC_UI.countdownDays[locale] },
    { value: remaining.hours, label: CINEMATIC_UI.countdownHours[locale] },
    { value: remaining.minutes, label: CINEMATIC_UI.countdownMinutes[locale] },
    { value: remaining.seconds, label: CINEMATIC_UI.countdownSeconds[locale] },
  ];

  return (
    <div>
      <p className="text-[11px] tracking-[0.22em] text-text-secondary">
        {CINEMATIC_UI.heroCountdownTitle[locale]}
      </p>
      <div className="mt-3 grid grid-cols-4 gap-3">
        {units.map((unit) => (
          <div key={unit.label} className="flex flex-col items-center gap-1">
            <span className="font-display text-2xl font-bold tabular-nums tracking-tight text-accent md:text-3xl">
              {String(unit.value).padStart(2, '0')}
            </span>
            <span className="text-[10px] tracking-widest text-text-secondary">
              {unit.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HeroCountdown;
