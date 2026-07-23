'use client';

import { motion } from 'motion/react';
import { sceneItem } from '../../utils/scene-motion';

interface SceneHeaderProps {
  label?: string;
  heading?: string;
  centered?: boolean;
}

const SceneHeader = ({ label, heading, centered = false }: SceneHeaderProps) => {
  if (!label && !heading) {
    return null;
  }

  return (
    <motion.div
      variants={sceneItem}
      className={`flex max-w-2xl flex-col gap-3 ${
        centered ? 'mx-auto items-center text-center' : ''
      }`}
    >
      {label ? (
        <p className="text-sm font-medium tracking-widest text-text-secondary">
          {label}
        </p>
      ) : null}
      {heading ? (
        <h2 className="font-display text-3xl font-medium leading-tight text-balance md:text-5xl">
          {heading}
        </h2>
      ) : null}
    </motion.div>
  );
};

export default SceneHeader;
