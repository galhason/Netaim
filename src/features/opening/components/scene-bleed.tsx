'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { CSSProperties } from 'react';

/*
 * Light before content: each scene's lighting arrives ahead of its
 * photography and typography. The bleed straddles the boundary above
 * the scene and fades in early, so the visitor feels the next chapter
 * before seeing it — no scene owns its atmosphere, it flows.
 */
interface SceneBleedProps {
  tint: string;
}

const SceneBleed = ({ tint }: SceneBleedProps) => {
  const reduce = useReducedMotion();

  return (
    <motion.div
      aria-hidden="true"
      style={{ '--bleed-tone': tint } as CSSProperties}
      initial={reduce ? false : { opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '0px 0px -5% 0px' }}
      transition={{ duration: 1.8, ease: 'easeOut' }}
      className="cine-bleed pointer-events-none absolute inset-x-0 -top-24 h-[45vh]"
    />
  );
};

export default SceneBleed;
