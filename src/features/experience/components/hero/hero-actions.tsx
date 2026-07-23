'use client';

import { motion } from 'motion/react';
import type { CtaContent } from '../../types/scene-content';
import { heroItem } from './hero-motion';

interface HeroActionsProps {
  primary?: CtaContent;
  secondary?: CtaContent;
}

const HeroActions = ({ primary, secondary }: HeroActionsProps) => {
  if (!primary && !secondary) {
    return null;
  }

  return (
    <motion.div
      variants={heroItem}
      className="flex flex-wrap items-center gap-4 pt-4"
    >
      {primary ? (
        <motion.a
          href={primary.href}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          className="inline-flex min-h-12 items-center justify-center rounded-lg bg-brand px-8 font-medium text-brand-contrast"
        >
          {primary.label}
        </motion.a>
      ) : null}
      {secondary ? (
        <motion.a
          href={secondary.href}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          className="inline-flex min-h-12 items-center justify-center rounded-lg border border-current/50 px-8 font-medium"
        >
          {secondary.label}
        </motion.a>
      ) : null}
    </motion.div>
  );
};

export default HeroActions;
