import { getPayload } from 'payload';
import config from '@payload-config';
import type { Scene } from '@/payload-types';
import type { SceneData } from '@/experience-engine';
import type { ContentSource } from '@/features/events';

const toSceneData = (scene: Scene): SceneData => ({
  id: String(scene.id),
  type: scene.type,
  title: scene.title,
  enabled: scene.enabled ?? true,
  content: scene.content ?? {},
});

/*
 * The Payload implementation of the product's ContentSource. Storage
 * documents are mapped to product models at this boundary and never
 * leak upward. Navigation modeling arrives with the workspace sprint.
 */
export const payloadContentSource: ContentSource = {
  getEventExperience: async ({ slug, locale, draft }) => {
    const payload = await getPayload({ config });

    const result = await payload.find({
      collection: 'events',
      where: { slug: { equals: slug } },
      locale,
      draft,
      depth: 2,
      limit: 1,
    });

    const event = result.docs[0];

    if (!event) {
      return null;
    }

    const organization =
      typeof event.organization === 'object' ? event.organization : null;

    const experience =
      typeof event.experience === 'object' ? event.experience : null;

    const sceneDocs =
      experience?.scenes?.filter(
        (scene): scene is Scene => typeof scene === 'object',
      ) ?? [];

    return {
      slug: event.slug,
      title: event.title,
      brandName: organization?.name ?? event.title,
      navigation: [],
      scenes: sceneDocs.map(toSceneData),
    };
  },
};
