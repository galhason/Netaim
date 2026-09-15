'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';

/*
 * A film behind the words.
 *
 * Five rules, and each of them is a way this goes wrong in the wild:
 *
 * - Muted, always. A page that makes noise on arrival is a page people
 *   close, and every browser refuses to autoplay sound anyway.
 * - `playsInline`, or iOS Safari takes the video fullscreen the moment
 *   it starts, over the whole site.
 * - A poster underneath, not merely as the `poster` attribute: the
 *   attribute leaves a black rectangle while the file is fetched, and a
 *   hero that is black for two seconds on mobile data reads as broken.
 *   The still is a real layer, and the video fades in over it once it
 *   is genuinely playing.
 * - Reduced motion means no film at all. Not paused — absent. Someone
 *   who has asked their system for less movement has asked for this.
 * - Autoplay can still be refused (a data saver, a battery mode, a
 *   policy). `play()` returns a promise; when it rejects the still
 *   simply stays, and nobody sees an error.
 *
 * The element is decorative: the words above it carry the meaning, so
 * it is hidden from assistive technology entirely.
 */
interface BackgroundVideoProps {
  src: string;
  /* The still beneath: shown first, and shown alone when motion is off. */
  poster?: string;
  className?: string;
}

const BackgroundVideo = ({ src, poster, className }: BackgroundVideoProps) => {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video || reduceMotion) {
      return;
    }
    /*
     * Asked for rather than assumed. `autoPlay` alone is a request the
     * browser may decline silently; this way the still keeps its place
     * when it does.
     */
    const attempt = video.play();
    if (attempt && typeof attempt.catch === 'function') {
      attempt.catch(() => setPlaying(false));
    }
  }, [reduceMotion, src]);

  if (reduceMotion) {
    return null;
  }

  return (
    <video
      ref={ref}
      src={src}
      {...(poster ? { poster } : {})}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
      tabIndex={-1}
      onPlaying={() => setPlaying(true)}
      className={`${className ?? ''} transition-opacity duration-700 ${
        playing ? 'opacity-100' : 'opacity-0'
      }`}
    />
  );
};

export default BackgroundVideo;
