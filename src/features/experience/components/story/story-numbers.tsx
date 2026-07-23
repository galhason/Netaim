'use client';

import { motion } from 'motion/react';
import { sceneItem, sceneSequence } from '../../utils/scene-motion';

interface StoryNumber {
  value: string;
  label: string;
}

interface StoryNumbersProps {
  numbers: StoryNumber[];
}

const StoryNumbers = ({ numbers }: StoryNumbersProps) => (
  <motion.dl
    variants={sceneSequence}
    className="flex flex-wrap gap-x-14 gap-y-8 border-t border-border pt-10"
  >
    {numbers.map((number) => (
      <motion.div
        key={number.label}
        variants={sceneItem}
        className="flex flex-col gap-2"
      >
        <dd className="order-1 font-display text-6xl font-medium leading-none tracking-tight tabular-nums md:text-7xl">
          {number.value}
        </dd>
        <dt className="order-2 text-xs tracking-widest text-text-secondary">
          {number.label}
        </dt>
      </motion.div>
    ))}
  </motion.dl>
);

export default StoryNumbers;
