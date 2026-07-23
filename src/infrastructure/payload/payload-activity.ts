import type { ProductionLogEntry } from '@/features/studio/types/activity';
import { actorContext } from './payload-context';

const requireActor = async () => {
  const context = await actorContext();
  if (!context) {
    throw new Error('Sign-in required');
  }
  return context;
};

/*
 * The production log, derived from what actually happened: the latest
 * touched experiences and the newest media, merged on one timeline.
 * No audit collection yet — timestamps tell the story honestly.
 */
const EVENT_LIMIT = 12;
const MEDIA_LIMIT = 6;

export const payloadProductionLog = async (): Promise<ProductionLogEntry[]> => {
  const { payload, user } = await requireActor();
  const [events, media] = await Promise.all([
    payload.find({
      collection: 'events',
      overrideAccess: false,
      user,
      draft: true,
      sort: '-updatedAt',
      limit: EVENT_LIMIT,
    }),
    payload.find({
      collection: 'media',
      overrideAccess: false,
      user,
      sort: '-createdAt',
      limit: MEDIA_LIMIT,
    }),
  ]);

  const entries: ProductionLogEntry[] = [
    ...events.docs.map((event: { title: string; slug?: string | null; _status?: string | null; updatedAt: string }) => ({
      kind: 'experience' as const,
      title: event.title,
      slug: event.slug ?? undefined,
      live: event._status === 'published',
      at: event.updatedAt,
    })),
    ...media.docs.map((item: { alt?: string | null; filename?: string | null; createdAt: string }) => ({
      kind: 'media' as const,
      title: item.alt || item.filename || '',
      live: true,
      at: item.createdAt,
    })),
  ];

  return entries.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
};
