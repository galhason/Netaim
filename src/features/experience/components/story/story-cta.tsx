'use client';

import { motion } from 'motion/react';
import type { CtaContent } from '../../types/scene-content';
import { sceneItem } from '../../utils/scene-motion';

interface StoryCtaProps {
  cta: CtaContent;
}

const StoryCta = ({ cta }: StoryCtaProps) => (
  <motion.div variants={sceneItem}>
    <a
      href={cta.href}
      className="inline-flex min-h-12 items-center font-medium underline decoration-current/40 underline-offset-8 transition-colors hover:decoration-current"
    >
      {cta.label}
    </a>
  </motion.div>
);

export default StoryCta;
