import { actorContext, getSystemPayload } from './payload-context';
import { mediaId, mediaUrl, toMediaRelation } from './payload-media';

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

/*
 * The site's logo, as two URLs.
 *
 * Read with system access, like the pointer above: the logo is drawn in
 * the header of every public page, including for visitors who are not
 * signed in to anything. `depth: 1` is what populates the upload, and
 * both fields are optional — an unset field yields null and the caller
 * falls back to the artwork shipped with the build.
 */
export interface SiteLogos {
  onLight: string | null;
  onDark: string | null;
}

export const payloadSiteLogos = async (): Promise<SiteLogos> => {
  const payload = await getSystemPayload();
  const site = await payload
    .findGlobal({ slug: 'site', depth: 1 })
    .catch(() => null);
  const light = mediaUrl(site?.logo) ?? null;
  /* One upload is the common case: it stands in for both treatments. */
  const dark = mediaUrl(site?.logoOnDark) ?? light;
  return { onLight: light, onDark: dark };
};

/*
 * The same two fields as the Studio holds them: media ids, not URLs.
 * The screen that sets the logo has to show which file is currently
 * chosen, and a URL cannot be matched back to a library entry without
 * guessing.
 */
export const payloadSiteLogoChoice = async (): Promise<{
  logo: string | null;
  logoOnDark: string | null;
}> => {
  const payload = await getSystemPayload();
  const site = await payload
    .findGlobal({ slug: 'site', depth: 0 })
    .catch(() => null);
  return {
    logo: mediaId(site?.logo) ?? null,
    logoOnDark: mediaId(site?.logoOnDark) ?? null,
  };
};

export const payloadSetSiteLogos = async (logos: {
  logo?: string | null;
  logoOnDark?: string | null;
}): Promise<void> => {
  const context = await actorContext();
  if (!context) {
    throw new Error('Sign-in required');
  }
  const { payload, user } = context;
  const data: Record<string, number | null> = {};
  const logo = toMediaRelation(logos.logo);
  const onDark = toMediaRelation(logos.logoOnDark);
  if (logo !== undefined) {
    data.logo = logo;
  }
  if (onDark !== undefined) {
    data.logoOnDark = onDark;
  }
  if (Object.keys(data).length === 0) {
    return;
  }
  await payload.updateGlobal({
    slug: 'site',
    overrideAccess: false,
    user,
    data,
  });
};
