import { actorContext, getSystemPayload } from './payload-context';

/*
 * The live-site pointer. Reads use system access (visitors are
 * anonymous); the write comes only from the Studio under the acting
 * creator with access control enforced.
 */

/*
 * The slug of the conference explicitly chosen as the live site — but
 * only while it is actually published. An unset pointer, or one aimed
 * at a conference that was unpublished/archived, yields null so the
 * caller can fall back to the newest launched conference.
 */
export const payloadActiveConferenceSlug = async (): Promise<string | null> => {
  const payload = await getSystemPayload();
  const site = await payload
    .findGlobal({ slug: 'site', depth: 1 })
    .catch(() => null);
  const active = site?.activeConference;
  if (active && typeof active === 'object') {
    if (active._status === 'published') {
      return active.slug ?? null;
    }
  }
  return null;
};

export const payloadSetActiveConference = async (
  slug: string | null,
): Promise<void> => {
  const context = await actorContext();
  if (!context) {
    throw new Error('Sign-in required');
  }
  const { payload, user } = context;
  let activeConference: number | null = null;
  if (slug) {
    const found = await payload.find({
      collection: 'events',
      overrideAccess: false,
      user,
      draft: true,
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
    });
    const event = found.docs[0];
    if (!event) {
      throw new Error('Event not found');
    }
    activeConference = Number(event.id);
  }
  await payload.updateGlobal({
    slug: 'site',
    overrideAccess: false,
    user,
    data: { activeConference },
  });
};
