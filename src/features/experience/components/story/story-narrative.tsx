'use client';

import { motion } from 'motion/react';
import { sceneItem } from '../../utils/scene-motion';

interface StoryNarrativeProps {
  paragraphs: string[];
}

const StoryNarrative = ({ paragraphs }: StoryNarrativeProps) => (
  <motion.div
    variants={sceneItem}
    className="flex max-w-prose flex-col gap-6 text-base leading-relaxed text-text-secondary md:text-lg"
  >
    {paragraphs.map((paragraph, index) => (
      <p key={index}>{paragraph}</p>
    ))}
  </motion.div>
);

export default StoryNarrative;
