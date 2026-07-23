'use client';

import { motion } from 'motion/react';
import { heroItem, heroThreshold } from './hero-motion';

interface HeroContentProps {
  headline: string;
  eyebrow?: string;
  subheadline?: string;
  description?: string;
  badge?: string;
}

const HeroContent = ({
  headline,
  eyebrow,
  subheadline,
  description,
  badge,
}: HeroContentProps) => (
  <div className="flex flex-col items-start gap-5">
    {badge ? (
      <motion.span
        variants={heroItem}
        className="rounded-full border border-current/30 px-4 py-1.5 text-xs font-medium"
      >
        {badge}
      </motion.span>
    ) : null}
    <motion.span
      variants={heroThreshold}
      aria-hidden="true"
      className="block h-px w-16 origin-left bg-accent rtl:origin-right"
    />
    {eyebrow ? (
      <motion.p
        variants={heroItem}
        className="text-sm font-medium tracking-widest opacity-80"
      >
        {eyebrow}
      </motion.p>
    ) : null}
    <motion.h1
      variants={heroItem}
      className="font-display text-4xl font-medium leading-tight tracking-tight text-balance md:text-6xl"
    >
      {headline}
    </motion.h1>
    {subheadline ? (
      <motion.p variants={heroItem} className="text-lg opacity-80 md:text-xl">
        {subheadline}
      </motion.p>
    ) : null}
    {description ? (
      <motion.p
        variants={heroItem}
        className="max-w-prose text-sm opacity-70 md:text-base"
      >
        {description}
      </motion.p>
    ) : null}
  </div>
);

export default HeroContent;
