'use client';

import { motion } from 'motion/react';
import { sceneItem } from '../../utils/scene-motion';

interface StoryQuoteProps {
  text: string;
  attribution?: string;
}

const StoryQuote = ({ text, attribution }: StoryQuoteProps) => (
  <motion.figure
    variants={sceneItem}
    className="flex max-w-3xl flex-col gap-5"
  >
    <span aria-hidden="true" className="block h-px w-12 bg-accent" />
    <blockquote className="font-display text-2xl font-medium leading-snug text-balance md:text-4xl">
      {text}
    </blockquote>
    {attribution ? (
      <figcaption className="text-sm text-text-secondary">
        {attribution}
      </figcaption>
    ) : null}
  </motion.figure>
);

export default StoryQuote;
