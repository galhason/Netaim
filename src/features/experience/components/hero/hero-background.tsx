'use client';

import Image from 'next/image';
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';
import type { ImageMedia, VideoMedia } from '../../types/scene-content';

interface HeroBackgroundProps {
  image?: ImageMedia;
  video?: VideoMedia;
}

/*
 * Video is part of the background contract but intentionally unrendered:
 * playback policy (autoplay, mute, reduced-motion fallback) is a design
 * phase decision. The image path is the production baseline.
 * Parallax stays compositor-only (transform), spring-smoothed, and is
 * disabled entirely under reduced motion.
 */
const HeroBackground = ({ image }: HeroBackgroundProps) => {
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const drift = useTransform(scrollY, [0, 600], [0, 32]);
  const y = useSpring(drift, { stiffness: 60, damping: 20 });

  if (!image) {
    return null;
  }

  return (
    <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 0.8 } }}
        style={reduceMotion ? undefined : { y }}
        className="absolute inset-0 scale-105"
      >
        <Image
          src={image.url}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </motion.div>
      <div className="absolute inset-x-0 top-0 h-32 bg-linear-to-b from-scrim/60 to-transparent" />
      <div className="absolute inset-0 bg-linear-to-t from-scrim/85 via-scrim/35 to-transparent" />
    </div>
  );
};

export default HeroBackground;
