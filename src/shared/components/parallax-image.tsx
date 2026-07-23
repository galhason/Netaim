'use client';

import Image from 'next/image';
import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';

interface ParallaxImageProps {
  src: string;
  sizes: string;
  className?: string;
  alt?: string;
  priority?: boolean;
}

/*
 * The single photographic parallax gesture: the image travels a few
 * percent slower than the page while its frame scrolls through the
 * viewport, like a camera holding on a subject. The -inset bleed hides
 * the travel so no edge is ever revealed; reduced motion pins the image.
 */
const TRAVEL_UP = '-7%';
const TRAVEL_DOWN = '7%';

const ParallaxImage = ({
  src,
  sizes,
  className,
  alt = '',
  priority = false,
}: ParallaxImageProps) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    reduce ? ['0%', '0%'] : [TRAVEL_UP, TRAVEL_DOWN],
  );

  return (
    <div ref={ref} className={`relative overflow-hidden ${className ?? ''}`}>
      <motion.div style={{ y }} className="absolute -inset-[8%]">
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      </motion.div>
    </div>
  );
};

export default ParallaxImage;
