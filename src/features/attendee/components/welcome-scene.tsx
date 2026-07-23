'use client';

import { motion } from 'motion/react';
import {
  sceneItem,
  sceneSequence,
  sceneThreshold,
} from '@/features/experience';
import type { AttendeeWelcome } from '../types/attendee-experience';

const DAY_MS = 86400000;

interface WelcomeSceneProps {
  welcome: AttendeeWelcome;
}

const WelcomeScene = ({ welcome }: WelcomeSceneProps) => {
  const remaining = Date.parse(welcome.countdownTarget) - Date.now();
  const days = Number.isNaN(remaining)
    ? null
    : Math.max(0, Math.ceil(remaining / DAY_MS));

  return (
    <section id="welcome" className="bg-surface text-text-primary">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={sceneSequence}
        className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col justify-center gap-6 px-6 pb-24 pt-32 md:px-12"
      >
        <motion.span
          variants={sceneThreshold}
          aria-hidden="true"
          className="block h-px w-16 origin-left bg-accent rtl:origin-right"
        />
        <motion.p
          variants={sceneItem}
          className="text-sm font-medium tracking-widest text-text-secondary"
        >
          {welcome.greeting}
        </motion.p>
        <motion.h1
          variants={sceneItem}
          className="max-w-3xl font-display text-4xl font-medium leading-tight tracking-tight text-balance md:text-6xl"
        >
          {welcome.heading}
        </motion.h1>
        {days !== null ? (
          <motion.p variants={sceneItem} className="flex items-baseline gap-3">
            <span
              suppressHydrationWarning
              className="font-display text-7xl font-medium leading-none tracking-tight tabular-nums md:text-8xl"
            >
              {days}
            </span>
            <span className="text-sm tracking-widest text-text-secondary">
              {welcome.countdownLabel}
            </span>
          </motion.p>
        ) : null}
        <motion.p
          variants={sceneItem}
          className="flex flex-wrap items-center gap-x-3 text-sm opacity-80"
        >
          <span>{welcome.eventDateLabel}</span>
          <span aria-hidden="true" className="opacity-40">
            |
          </span>
          <span>{welcome.venueLine}</span>
        </motion.p>
        <motion.div
          variants={sceneItem}
          className="flex flex-wrap items-center gap-6 pt-4"
        >
          <motion.a
            href={welcome.primaryCta.href}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex min-h-12 items-center justify-center rounded-lg bg-brand px-8 font-medium text-brand-contrast"
          >
            {welcome.primaryCta.label}
          </motion.a>
          {welcome.secondaryCta ? (
            <a
              href={welcome.secondaryCta.href}
              className="inline-flex min-h-12 items-center font-medium underline decoration-current/40 underline-offset-8 transition-colors hover:decoration-current"
            >
              {welcome.secondaryCta.label}
            </a>
          ) : null}
        </motion.div>
      </motion.div>
    </section>
  );
};

export default WelcomeScene;
