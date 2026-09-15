'use client';

import Image from 'next/image';
import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import BackgroundVideo from './background-video';

interface ParallaxImageProps {
  src: string;
  sizes: string;
  className?: string;
  alt?: string;
  priority?: boolean;
  /*
   * The same frame, holding a film instead of a photograph. `src` is
   * then the film's poster — what is painted immediately, what stays
   * under reduced motion, and what remains if autoplay is refused —
   * and it may be empty, which is why the still is rendered only when
   * there is one. The parallax applies to both, so a section does not
   * move differently depending on which kind of file it was given.
   */
  video?: string;
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
  video,
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
        {src ? (
          <Image
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            priority={priority}
            className="object-cover"
          />
        ) : null}
        {video ? (
          <BackgroundVideo
            src={video}
            {...(src ? { poster: src } : {})}
            className="absolute inset-0 size-full object-cover"
          />
        ) : null}
      </motion.div>
    </div>
  );
};

export default ParallaxImage;
