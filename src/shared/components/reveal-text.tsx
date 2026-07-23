'use client';

import { motion, useReducedMotion, type Variants } from 'motion/react';
import type { ElementType } from 'react';

interface RevealTextProps {
  text: string;
  className?: string;
  as?: ElementType;
  trigger?: 'mount' | 'view';
  delay?: number;
}

const container: Variants = {
  hidden: {},
  visible: (delay: number) => ({
    transition: { staggerChildren: 0.06, delayChildren: delay },
  }),
};

const wordVariant: Variants = {
  hidden: { opacity: 0, y: '0.65em' },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] },
  },
};

/*
 * Reveals a line word by word. The animated words are hidden from
 * assistive tech; the full string is exposed once via a visually hidden
 * copy. Reduced motion renders the plain text.
 */
const RevealText = ({
  text,
  className,
  as: Tag = 'span',
  trigger = 'view',
  delay = 0,
}: RevealTextProps) => {
  const reduce = useReducedMotion();
  if (reduce) {
    return <Tag className={className}>{text}</Tag>;
  }

  const words = text.split(' ');
  const motionProps =
    trigger === 'mount'
      ? { initial: 'hidden', animate: 'visible' }
      : {
          initial: 'hidden',
          whileInView: 'visible',
          viewport: { once: true, amount: 0.5 },
        };

  return (
    <Tag className={className}>
      <motion.span
        aria-hidden="true"
        className="inline"
        variants={container}
        custom={delay}
        {...motionProps}
      >
        {words.map((word, index) => (
          <motion.span
            key={`${word}-${index}`}
            variants={wordVariant}
            className="inline-block whitespace-pre"
          >
            {word}
            {index < words.length - 1 ? ' ' : ''}
          </motion.span>
        ))}
      </motion.span>
      <span className="sr-only">{text}</span>
    </Tag>
  );
};

export default RevealText;
