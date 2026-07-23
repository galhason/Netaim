'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  className?: string;
  id?: string;
  delay?: number;
}

/*
 * The single scene-enter gesture: a soft rise and fade as the section
 * scrolls into view, once. Reduced motion renders the scene in place with
 * no transform.
 */
const Reveal = ({ children, className, id, delay = 0 }: RevealProps) => {
  const reduce = useReducedMotion();

  return (
    <motion.section
      id={id}
      className={className}
      initial={reduce ? false : { opacity: 0, y: 48 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay }}
    >
      {children}
    </motion.section>
  );
};

export default Reveal;
