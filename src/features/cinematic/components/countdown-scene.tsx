'use client';

import { useEffect, useState } from 'react';
import type { Locale } from '@/config/locales';
import { CINEMATIC_UI } from '../constants/cinematic-content';
import { Reveal } from '@/shared';

interface CountdownSceneProps {
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
 * The countdown — anticipation made visible. It renders empty on the
 * server and wakes on the client, so the numbers are always true and
 * hydration never argues with the clock. Past events show nothing:
 * a countdown to yesterday is noise. Each unit rests on floating glass.
 */
const CountdownScene = ({ startsAt, locale }: CountdownSceneProps) => {
  const [remaining, setRemaining] = useState<Remaining | null>(null);
  const [ready, setReady] = useState(false);
  const target = startsAt ? Date.parse(startsAt) : Number.NaN;

  useEffect(() => {
    if (Number.isNaN(target)) {
      setReady(true);
      return;
    }
    const tick = () => {
      setRemaining(remainingUntil(target));
      setReady(true);
    };
    tick();
    const interval = window.setInterval(tick, SECOND);
    return () => window.clearInterval(interval);
  }, [target]);

  if (!ready || !remaining) {
    return null;
  }

  const units = [
    { value: remaining.days, label: CINEMATIC_UI.countdownDays[locale] },
    { value: remaining.hours, label: CINEMATIC_UI.countdownHours[locale] },
    { value: remaining.minutes, label: CINEMATIC_UI.countdownMinutes[locale] },
    { value: remaining.seconds, label: CINEMATIC_UI.countdownSeconds[locale] },
  ];

  return (
    <section className="py-14 md:py-20">
      <Reveal className="mx-auto max-w-6xl px-6 md:px-12">
        <p className="text-center text-xs font-medium tracking-[0.3em] text-accent md:text-sm">
          {CINEMATIC_UI.countdownEyebrow[locale]}
        </p>
        <div className="mx-auto mt-8 grid max-w-2xl grid-cols-4 gap-3 md:gap-6">
          {units.map((unit) => (
            <div
              key={unit.label}
              className="cine-card flex flex-col items-center gap-2 rounded-2xl py-5 md:py-7"
            >
              <span className="font-display text-3xl font-bold tabular-nums tracking-tight text-accent md:text-5xl">
                {String(unit.value).padStart(2, '0')}
              </span>
              <span className="text-xs tracking-widest text-text-secondary">
                {unit.label}
              </span>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
};

export default CountdownScene;
