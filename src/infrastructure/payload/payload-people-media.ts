import type {
  MediaRepository,
  MediaSummary,
  PeopleRepository,
  PersonSummary,
  SceneContentRepository,
} from '@/features/events/types/event-repository';
import type { Media, Speaker } from '@/payload-types';
import { actorContext, getSystemPayload } from './payload-context';

const requireActor = async () => {
  const context = await actorContext();
  if (!context) {
    throw new Error('Sign-in required');
  }
  return context;
};

const toPerson = (speaker: Speaker): PersonSummary => ({
  id: String(speaker.id),
  name: speaker.name,
  role: speaker.role ?? undefined,
  portraitUrl:
    typeof speaker.photo === 'object' && speaker.photo?.url
      ? speaker.photo.url
      : undefined,
});

const toMedia = (media: Media): MediaSummary => ({
  id: String(media.id),
  url: media.url ?? '',
  alt: media.alt,
  filename: media.filename ?? '',
});

export const payloadPeopleRepository: PeopleRepository = {
  listPeople: async () => {
    const { payload, user } = await requireActor();
    const result = await payload.find({
      collection: 'speakers',
      overrideAccess: false,
      user,
      sort: 'name',
      limit: 100,
      depth: 1,
    });
    return result.docs.map(toPerson);
  },

  addPerson: async ({ name, role }) => {
    const { payload, user, organizationId } = await requireActor();
    if (organizationId == null) {
      throw new Error('No organization available for this creator');
    }
    const speaker = await payload.create({
      collection: 'speakers',
      overrideAccess: false,
      user,
      data: { organization: organizationId, name, role },
    });
    return toPerson(speaker);
  },

  updatePerson: async (id, input) => {
    const { payload, user } = await requireActor();
    const speaker = await payload.update({
      collection: 'speakers',
      id,
      overrideAccess: false,
      user,
      data: input,
    });
    return toPerson(speaker);
  },
};

export const payloadMediaRepository: MediaRepository = {
  listMedia: async (search) => {
    const { payload, user } = await requireActor();
    const result = await payload.find({
      collection: 'media',
      overrideAccess: false,
      user,
      sort: '-createdAt',
      limit: 60,
      where: search
        ? {
            or: [
              { alt: { contains: search } },
              { filename: { contains: search } },
            ],
          }
        : undefined,
    });
    return result.docs.map(toMedia);
  },

  addMedia: async ({ file, alt }) => {
    const { payload, user, organizationId } = await requireActor();
    if (organizationId == null) {
      throw new Error('No organization available for this creator');
    }
    const media = await payload.create({
      collection: 'media',
      overrideAccess: false,
      user,
      data: { organization: organizationId, alt },
      file: {
        name: file.name,
        mimetype: file.type,
        data: Buffer.from(file.data),
        size: file.data.byteLength,
      },
    });
    return toMedia(media);
  },
};

export const payloadSceneContentRepository: SceneContentRepository = {
  updateSceneContent: async (sceneId, locale, patch) => {
    const { payload, user } = await requireActor();
    const scene = await payload.findByID({
      collection: 'scenes',
      id: sceneId,
      overrideAccess: false,
      user,
      locale: locale as 'he' | 'en',
      draft: true,
    });
    const current =
      typeof scene.content === 'object' && scene.content !== null
        ? (scene.content as Record<string, unknown>)
        : {};
    await payload.update({
      collection: 'scenes',
      id: sceneId,
      overrideAccess: false,
      user,
      locale: locale as 'he' | 'en',
      draft: true,
      data: { content: { ...current, ...patch } },
    });
  },
};

/*
 * The public face of the speakers wall: anonymous read of published
 * speaker cards (org content is publicly readable; no actor exists on
 * the guest side, hence the system path).
 */
export const payloadListPublicSpeakers = async (): Promise<
  { id: string; name: string; role?: string; portraitUrl?: string }[]
> => {
  const payload = await getSystemPayload();
  const result = await payload.find({
    collection: 'speakers',
    sort: 'name',
    limit: 100,
    depth: 1,
    overrideAccess: true,
  });
  return result.docs.map((speaker) => ({
    id: String(speaker.id),
    name: speaker.name ?? '',
    role: speaker.role ?? undefined,
    portraitUrl:
      typeof speaker.photo === 'object' && speaker.photo?.url
        ? speaker.photo.url
        : undefined,
  }));
};
