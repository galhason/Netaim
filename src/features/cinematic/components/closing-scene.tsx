'use client';

import Link from 'next/link';
import { motion, useReducedMotion, type Variants } from 'motion/react';
import type { ReactNode } from 'react';
import type { Locale } from '@/config/locales';
import type {
  ClosingScene as ClosingSceneData,
  WhyStatistic,
} from '../types/cinematic';
import { IconBulb, IconCalendar, IconUsers } from './icons';
import { RevealText } from '@/shared';

interface ClosingSceneProps {
  closing: ClosingSceneData;
  registerHref?: string;
  facts?: WhyStatistic[];
  locale: Locale;
}

const EASE = [0.16, 1, 0.3, 1] as const;

const statList: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
};

const statItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

const STAT_ICONS: ((props: { className?: string }) => ReactNode)[] = [
  IconCalendar,
  IconBulb,
  IconUsers,
  IconUsers,
];

const EYEBROW: Record<Locale, string> = { he: 'השלב הבא', en: 'The next step' };
const SUPPORT: Record<Locale, string> = {
  he: 'עיינו בתוכנית הכנס ובחרו את ההרצאות, הסדנאות והמפגשים שתרצו להשתתף בהם.',
  en: 'Browse the program and choose the sessions, workshops and meetups you want to attend.',
};
const PRIMARY: Record<Locale, string> = {
  he: 'עיון בהרצאות ובסדנאות',
  en: 'Browse sessions & workshops',
};

/*
 * Scene 08 — The soft landing, not a grand finale: a calm, typographic
 * close that hands the visitor — already registered — onward to plan
 * their own conference, choosing the sessions and workshops to attend.
 * No second hero, no background image; the words and a quiet row of
 * numbers do the work. The button leads to the full Program.
 */
const ClosingScene = ({ closing, facts = [], locale }: ClosingSceneProps) => {
  const reduce = useReducedMotion();
  const programHref = `/${locale}/program`;
  const stats = facts.slice(0, 4);

  return (
    <section
      id="register"
      className="relative overflow-hidden pt-16 pb-16 md:pt-20 md:pb-20"
    >
      {/* Soft bronze radial + a low horizon glow — no image */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-[420px] max-w-[1000px] bg-[radial-gradient(50%_50%_at_50%_35%,color-mix(in_srgb,var(--color-accent)_9%,transparent),transparent_70%)] blur-2xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[radial-gradient(60%_100%_at_50%_100%,color-mix(in_srgb,var(--color-accent)_13%,transparent),transparent_72%)] blur-xl"
      />

      <div className="relative mx-auto max-w-3xl px-6 text-center md:px-12">
        <p className="text-sm font-medium uppercase tracking-[0.34em] text-accent">
          {EYEBROW[locale]}
        </p>

        <RevealText
          as="h2"
          text={closing.line}
          className="mx-auto mt-6 block max-w-2xl font-display text-4xl font-extrabold leading-[1.12] tracking-tight md:text-5xl lg:text-6xl"
        />

        <motion.p
          initial={reduce ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
          className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-text-secondary"
        >
          {SUPPORT[locale]}
        </motion.p>

        {/* Primary action → the full Program */}
        <div className="mt-9 flex justify-center">
          <Link
            href={programHref}
            className="group inline-flex min-h-14 items-center gap-3 rounded-2xl bg-brand px-10 text-base font-medium text-brand-contrast shadow-[0_20px_60px_-14px_rgba(201,161,93,0.6)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_26px_72px_-12px_rgba(201,161,93,0.78)]"
          >
            {PRIMARY[locale]}
            <span
              aria-hidden="true"
              className="transition-transform duration-300 group-hover:-translate-x-1"
            >
              ←
            </span>
          </Link>
        </div>

        {/* The conference in numbers — supporting the invitation, quietly */}
        {stats.length > 0 ? (
          <motion.ul
            initial={reduce ? false : 'hidden'}
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={statList}
            className="mt-14 flex flex-wrap items-start justify-center gap-x-12 gap-y-8 md:mt-16 md:gap-x-20"
          >
            {stats.map((stat, index) => {
              const Icon = STAT_ICONS[index] ?? IconUsers;
              return (
                <motion.li
                  key={stat.label}
                  variants={statItem}
                  className="flex flex-col items-center gap-2"
                >
                  <Icon className="size-6 text-accent/80" />
                  <span className="font-display text-4xl font-bold tracking-tight text-text-primary md:text-5xl">
                    {stat.value}
                  </span>
                  <span className="text-sm text-text-secondary">
                    {stat.label}
                  </span>
                </motion.li>
              );
            })}
          </motion.ul>
        ) : null}
      </div>
    </section>
  );
};

export default ClosingScene;
