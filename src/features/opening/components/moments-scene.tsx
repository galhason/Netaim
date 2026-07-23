import { ParallaxImage, Reveal, RevealText } from '@/shared';
import { SCENE_BLEEDS } from '../constants/opening-content';
import type { OpeningMoments } from '../types/opening';
import SceneBleed from './scene-bleed';

/*
 * Moments, not a gallery: an uneven editorial mosaic of frames from the
 * conference story — backstage, faces, the hall — each one documentary,
 * none decorative.
 */
const MOSAIC_SPANS = [
  'md:col-span-2 md:row-span-2',
  '',
  '',
  '',
  '',
  'md:col-span-2',
] as const;

interface MomentsSceneProps {
  moments: OpeningMoments;
}

const MomentsScene = ({ moments }: MomentsSceneProps) => (
  <section id="moments" className="relative pb-24 md:pb-36">
    <SceneBleed tint={SCENE_BLEEDS.moments} />
    <Reveal className="mx-auto max-w-7xl px-6 pb-10 md:px-12">
      <RevealText
        as="h2"
        text={moments.title}
        className="block font-display text-3xl font-bold tracking-tight md:text-5xl"
      />
    </Reveal>
    <div className="grid auto-rows-[24vh] grid-cols-2 gap-1.5 md:auto-rows-[26vh] md:grid-cols-4">
      {moments.images.map((image, index) => (
        <ParallaxImage
          key={image}
          src={image}
          sizes="(max-width: 768px) 50vw, 25vw"
          className={`size-full ${MOSAIC_SPANS[index % MOSAIC_SPANS.length] ?? ''}`}
        />
      ))}
    </div>
  </section>
);

export default MomentsScene;
