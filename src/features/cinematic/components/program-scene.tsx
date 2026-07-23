'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import type { Locale } from '@/config/locales';
import { CINEMATIC_UI } from '../constants/cinematic-content';
import type { ProgramDay } from '../types/cinematic';
import { RevealText } from '@/shared';

interface ProgramSceneProps {
  program: ProgramDay[];
  locale: Locale;
}

const EASE = [0.16, 1, 0.3, 1] as const;
const HIGHLIGHTS_PER_DAY = 4;

const HEAD = {
  eyebrow: { he: 'תוכנית הכנס', en: 'Conference program' },
  title: { he: 'במבט מהיר על הכנס', en: 'A quick look at the conference' },
};

const subtitle = (days: number, locale: Locale): string => {
  if (locale === 'en') {
    return `${days} inspiring day${days === 1 ? '' : 's'} of talks, workshops, networking and meaningful conversations.`;
  }
  const count = days === 1 ? 'יום' : days === 2 ? 'יומיים' : `${days} ימים`;
  return `${count} של תוכן, חדשנות וחיבורים משמעותיים עם המובילים בתחומם.`;
};

/* One elegant icon per milestone — opening, collaboration, closing. */
const DayIcon = ({ index }: { index: number }): ReactNode => {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: 'size-7',
    'aria-hidden': true as const,
  };
  const kind = index % 3;
  if (kind === 0) {
    // Opening — people gathering
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="2.4" />
        <path d="M4 19v-1a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v1" />
        <path d="M16 7.2a2.4 2.4 0 0 1 0 4.4M20 19v-1a4 4 0 0 0-3-3.7" />
      </svg>
    );
  }
  if (kind === 1) {
    // Collaboration — session / board
    return (
      <svg {...common}>
        <rect x="3.5" y="4" width="17" height="11" rx="1.5" />
        <path d="M12 15v4M8.5 19h7" />
        <path d="M8 9.5h8M8 12h5" />
      </svg>
    );
  }
  // Impact — star
  return (
    <svg {...common} fill="currentColor" stroke="none">
      <path d="M12 3.5l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 9.2l5.4-.8z" />
    </svg>
  );
};

/*
 * Scene 06 — Program preview, reimagined as the journey of the conference
 * rather than a timetable: one thin bronze line, a milestone for each day,
 * and the shape of what that day holds. It answers "what does this
 * conference include?" — the hour-by-hour agenda lives on the Program
 * page. The line draws itself, the milestones arrive one by one, then each
 * day's story rises. Everything is drawn from the CMS program.
 */
const ProgramScene = ({ program, locale }: ProgramSceneProps) => {
  const reduce = useReducedMotion();
  const days = program.filter((d) => d?.items?.length);

  if (days.length === 0) {
    return null;
  }

  return (
    <section
      id="program"
      className="relative overflow-hidden pt-12 pb-20 md:pt-16 md:pb-28"
    >
      {/* Soft bronze lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/4 mx-auto h-[440px] max-w-[1000px] bg-[radial-gradient(50%_50%_at_50%_50%,color-mix(in_srgb,var(--color-accent)_8%,transparent),transparent_72%)] blur-2xl"
      />

      <div className="relative mx-auto max-w-[1240px] px-6 md:px-12">
        {/* Header */}
        <div className="mx-auto mb-16 max-w-[680px] text-center md:mb-24">
          <p className="text-sm font-medium uppercase tracking-[0.34em] text-accent">
            {HEAD.eyebrow[locale]}
          </p>
          <RevealText
            as="h2"
            text={HEAD.title[locale]}
            className="mx-auto mt-5 block font-display text-4xl font-extrabold tracking-tight md:text-6xl"
          />
          <p className="mx-auto mt-5 text-base leading-relaxed text-text-secondary md:text-lg">
            {subtitle(days.length, locale)}
          </p>
        </div>

        {/* Timeline */}
        <div className="relative grid grid-cols-1 gap-16 sm:grid-cols-2 md:gap-x-10 lg:grid-cols-3">
          {/* The line, drawn from the reading start across the milestones */}
          <motion.span
            aria-hidden="true"
            className="absolute inset-x-[10%] top-[6.75rem] hidden h-px origin-right bg-gradient-to-l from-transparent via-accent/45 to-transparent lg:block"
            initial={reduce ? false : { scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 1, ease: EASE }}
          />

          {days.slice(0, 3).map((day, index) => {
            const circleDelay = 0.9 + index * 0.2;
            const textDelay = 1.5 + index * 0.15;
            return (
              <div
                key={day.label ?? index}
                className="relative flex flex-col items-center text-center"
              >
                {/* Day number */}
                <motion.div
                  className="flex h-16 flex-col justify-end"
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.5, ease: EASE, delay: circleDelay }}
                >
                  <span className="text-sm font-medium tracking-[0.2em] text-text-secondary">
                    {locale === 'he' ? 'יום' : 'Day'}
                  </span>
                  <span className="font-display text-5xl font-bold leading-none text-accent md:text-6xl">
                    {index + 1}
                  </span>
                </motion.div>

                {/* Milestone circle */}
                <motion.span
                  className="relative z-10 my-6 grid size-16 place-items-center rounded-full border border-accent/40 bg-surface text-accent shadow-[0_0_30px_-8px_rgba(201,161,93,0.5)]"
                  initial={reduce ? false : { opacity: 0, scale: 0.5 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{
                    duration: 0.5,
                    ease: EASE,
                    delay: circleDelay + 0.1,
                  }}
                >
                  <DayIcon index={index} />
                </motion.span>

                {/* Day story */}
                <motion.div
                  initial={reduce ? false : { opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.6, ease: EASE, delay: textDelay }}
                >
                  {day.theme || day.label ? (
                    <h3 className="font-display text-2xl font-bold tracking-tight text-text-primary md:text-3xl">
                      {day.theme || day.label}
                    </h3>
                  ) : null}
                  {day.description ? (
                    <p className="mx-auto mt-3 max-w-xs text-base leading-relaxed text-text-secondary">
                      {day.description}
                    </p>
                  ) : null}
                  <ul className="mt-6 flex flex-col items-center gap-2.5">
                    {day.items.slice(0, HIGHLIGHTS_PER_DAY).map((item) => (
                      <li
                        key={item.title}
                        className="flex items-center gap-2.5 text-base text-text-secondary"
                      >
                        <span className="size-1.5 flex-none rounded-full bg-accent/70" />
                        {item.title}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </div>
            );
          })}
        </div>

        {/* Door to the full program */}
        <div className="mt-20 flex justify-center">
          <Link
            href={`/${locale}/program`}
            className="group inline-flex min-h-[3.5rem] items-center gap-3 rounded-2xl border border-accent/45 px-12 text-base font-medium text-accent transition-all duration-300 hover:bg-accent/10"
          >
            {CINEMATIC_UI.viewFullProgram[locale]}
            <span
              aria-hidden="true"
              className="transition-transform duration-300 group-hover:-translate-x-1"
            >
              ←
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ProgramScene;
