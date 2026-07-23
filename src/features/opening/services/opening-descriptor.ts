import { BRAND_NAME } from '@/config/brand';
import { applyComposition } from '@/experience-runtime';
import type { ExperienceDescriptor } from '@/experience-runtime';
import { OPENING_SCENE_TYPES } from '../constants/opening-content';
import type { OpeningContent } from '../types/opening';

/*
 * The homepage as a declarative Experience (Constitution v2 §13): the
 * service describes which scenes play and with what content; the
 * Runtime decides everything else. The scene list itself is data — a
 * featured conference swaps the first scene without a condition in any
 * renderer.
 */
export const buildOpeningDescriptor = (
  content: OpeningContent,
): ExperienceDescriptor => ({
  id: 'homepage',
  type: 'homepage',
  lifecycle: 'live',
  dna: { tone: content.featured?.tone ?? 'bronze', texture: 'dust' },
  scenes: applyComposition(
    [
    {
      id: 'nav',
      type: OPENING_SCENE_TYPES.nav,
      content: { brand: BRAND_NAME, meHref: content.meHref },
    },
    content.featured
      ? {
          id: 'hero',
          type: OPENING_SCENE_TYPES.featuredHero,
          content: content.featured,
        }
      : { id: 'hero', type: OPENING_SCENE_TYPES.hero, content: content.hero },
    {
      id: 'portal-wall',
      type: OPENING_SCENE_TYPES.portalWall,
      content: { events: content.events, posters: content.posters },
    },
    { id: 'story', type: OPENING_SCENE_TYPES.story, content: content.why },
    {
      id: 'moments',
      type: OPENING_SCENE_TYPES.moments,
      content: content.moments,
    },
    {
      id: 'closing',
      type: OPENING_SCENE_TYPES.closing,
      content: content.closing,
    },
      {
        id: 'footer',
        type: OPENING_SCENE_TYPES.footer,
        content: { brand: BRAND_NAME },
      },
    ],
    content.composition ?? [],
  ),
});
