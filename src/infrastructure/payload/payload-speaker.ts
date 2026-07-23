import { relationshipId } from '@/auth';
import type { Locale } from '@/config/locales';
import type {
  ResolvedSpeaker,
  SpeakerActivity,
  SpeakerRepository,
  SpeakerSocialLink,
} from '@/features/speakers/types/speaker';
import { actorContext, getSystemPayload } from './payload-context';
import { mediaUrl } from './payload-media';

interface AccountRow {
  id?: number | string;
  name?: string | null;
  roleTitle?: string | null;
  orgName?: string | null;
  photo?: unknown;
  anonymizedAt?: string | null;
}

interface SpeakerRow {
  id: number | string;
  account?: unknown;
  name?: string | null;
  jobTitle?: string | null;
  company?: string | null;
  bio?: string | null;
  photo?: unknown;
  role?: string | null;
  socialLinks?: { label?: string | null; url?: string | null }[] | null;
  event?: unknown;
}

const clean = (value?: string | null): string | undefined => {
  const s = (value ?? '').trim();
  return s === '' ? undefined : s;
};

const accountOf = (row: SpeakerRow): AccountRow | undefined =>
  row.account && typeof row.account === 'object'
    ? (row.account as AccountRow)
    : undefined;

const toLinks = (
  rows: SpeakerRow['socialLinks'],
): SpeakerSocialLink[] =>
  (rows ?? [])
    .map((link) => ({ label: clean(link.label), url: (link.url ?? '').trim() }))
    .filter((link): link is SpeakerSocialLink => link.url !== '');

/*
 * The single resolution point (mirrors toOpeningSpeakers): a linked
 * account lends name, job title, company and photo; any manual field
 * overrides its account value for this conference. Legacy `role` stands
 * in for an empty jobTitle. Bio default (from the account's networking
 * profile) is filled only where it is needed — see getById.
 */
const resolveRow = (row: SpeakerRow): ResolvedSpeaker => {
  const account = accountOf(row);
  return {
    id: String(row.id),
    name: clean(row.name) ?? clean(account?.name) ?? '',
    jobTitle:
      clean(row.jobTitle) ?? clean(row.role) ?? clean(account?.roleTitle),
    company: clean(row.company) ?? clean(account?.orgName),
    bio: clean(row.bio),
    photoUrl: mediaUrl(row.photo as never) ?? mediaUrl(account?.photo as never),
    socialLinks: toLinks(row.socialLinks),
    isRegistered: Boolean(account ?? row.account),
    accountId:
      account?.id != null
        ? String(account.id)
        : row.account != null
          ? String(row.account)
          : undefined,
  };
};

const eventBySlug = async (
  payload: Awaited<ReturnType<typeof getSystemPayload>>,
  slug: string,
): Promise<{ id: number | string; organization: unknown } | null> => {
  const result = await payload.find({
    collection: 'events',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const row = result.docs[0] as
    | { id: number | string; organization: unknown }
    | undefined;
  return row ?? null;
};

const readSpeaker = async (
  payload: Awaited<ReturnType<typeof getSystemPayload>>,
  id: string,
  locale: Locale,
): Promise<SpeakerRow | null> => {
  const doc = await payload
    .findByID({
      collection: 'speakers',
      id,
      locale,
      depth: 2,
      overrideAccess: true,
    })
    .catch(() => null);
  return doc ? (doc as unknown as SpeakerRow) : null;
};

export const payloadSpeakerRepository: SpeakerRepository = {
  listByEvent: async (slug, locale) => {
    const payload = await getSystemPayload();
    const event = await eventBySlug(payload, slug);
    if (!event) {
      return [];
    }
    const result = await payload.find({
      collection: 'speakers',
      where: { event: { equals: event.id } },
      locale,
      depth: 2,
      sort: 'name',
      limit: 500,
      overrideAccess: true,
    });
    return (result.docs as unknown as SpeakerRow[]).map(resolveRow);
  },

  getById: async (id, locale) => {
    const payload = await getSystemPayload();
    const row = await readSpeaker(payload, id, locale);
    if (!row) {
      return null;
    }
    const resolved = resolveRow(row);
    /* Bio default: the linked account's networking-profile bio, resolved
     * only here (the speaker page), never in list paths. Override wins. */
    if (!resolved.bio && resolved.accountId) {
      const profile = await payload
        .find({
          collection: 'networking-profiles',
          where: {
            and: [
              { participant: { equals: resolved.accountId } },
              ...(row.event ? [{ event: { equals: relationshipId(row.event as never) } }] : []),
            ],
          },
          depth: 0,
          limit: 1,
          overrideAccess: true,
        })
        .catch(() => null);
      const bio = profile?.docs[0] as { bio?: string | null } | undefined;
      if (bio?.bio) {
        resolved.bio = bio.bio.trim() || undefined;
      }
    }
    return resolved;
  },

  createExternal: async (slug, input, locale) => {
    const context = await actorContext();
    if (!context) {
      throw new Error('Sign-in required');
    }
    const { payload, user } = context;
    const event = await eventBySlug(payload, slug);
    if (!event) {
      throw new Error('Event not found');
    }
    const doc = await payload.create({
      collection: 'speakers',
      data: {
        organization: Number(relationshipId(event.organization as never)),
        event: Number(event.id),
        name: input.name,
        jobTitle: input.jobTitle,
        company: input.company,
        bio: input.bio,
        photo: input.photoId ? Number(input.photoId) : undefined,
        socialLinks: input.socialLinks?.map((link) => ({
          label: link.label,
          url: link.url,
        })),
      },
      locale,
      overrideAccess: false,
      user,
    });
    return resolveRow(doc as unknown as SpeakerRow);
  },

  createLinked: async (slug, accountId, overrides, locale) => {
    const context = await actorContext();
    if (!context) {
      throw new Error('Sign-in required');
    }
    const { payload, user } = context;
    const event = await eventBySlug(payload, slug);
    if (!event) {
      throw new Error('Event not found');
    }
    /* one roster entry per (event, account): reuse, never duplicate */
    const existing = await payload
      .find({
        collection: 'speakers',
        where: {
          and: [
            { event: { equals: event.id } },
            { account: { equals: accountId } },
          ],
        },
        locale,
        depth: 2,
        limit: 1,
        overrideAccess: true,
      })
      .catch(() => null);
    const found = existing?.docs[0] as SpeakerRow | undefined;
    if (found) {
      return resolveRow(found);
    }
    const doc = await payload.create({
      collection: 'speakers',
      data: {
        organization: Number(relationshipId(event.organization as never)),
        event: Number(event.id),
        account: Number(accountId),
        name: overrides.name,
        jobTitle: overrides.jobTitle,
        company: overrides.company,
        bio: overrides.bio,
        photo: overrides.photoId ? Number(overrides.photoId) : undefined,
        socialLinks: overrides.socialLinks?.map((link) => ({
          label: link.label,
          url: link.url,
        })),
      },
      locale,
      overrideAccess: false,
      user,
    });
    /* re-read with depth so the linked account is populated */
    const full = await readSpeaker(payload, String(doc.id), locale);
    return resolveRow(full ?? (doc as unknown as SpeakerRow));
  },

  update: async (id, input, locale) => {
    const context = await actorContext();
    if (!context) {
      throw new Error('Sign-in required');
    }
    const { payload, user } = context;
    const doc = await payload
      .update({
        collection: 'speakers',
        id,
        data: {
          ...(input.name !== undefined ? { name: input.name || null } : {}),
          ...(input.jobTitle !== undefined
            ? { jobTitle: input.jobTitle || null }
            : {}),
          ...(input.company !== undefined
            ? { company: input.company || null }
            : {}),
          ...(input.bio !== undefined ? { bio: input.bio || null } : {}),
          ...(input.photoId !== undefined
            ? { photo: input.photoId ? Number(input.photoId) : null }
            : {}),
          ...(input.socialLinks !== undefined
            ? {
                socialLinks: input.socialLinks.map((link) => ({
                  label: link.label,
                  url: link.url,
                })),
              }
            : {}),
        },
        locale,
        depth: 2,
        overrideAccess: false,
        user,
      })
      .catch(() => null);
    return doc ? resolveRow(doc as unknown as SpeakerRow) : null;
  },

  listCandidates: async () => {
    const context = await actorContext();
    if (!context) {
      return [];
    }
    const { payload, user } = context;
    const result = await payload
      .find({
        collection: 'participants',
        overrideAccess: false,
        user,
        sort: 'name',
        limit: 300,
        depth: 1,
      })
      .catch(() => null);
    return ((result?.docs ?? []) as unknown as AccountRow[])
      .filter((row) => !row.anonymizedAt && (row.name ?? '').trim() !== '')
      .map((row) => ({
        accountId: String(row.id),
        name: (row.name ?? '').trim(),
        company: clean(row.orgName),
        jobTitle: clean(row.roleTitle),
        photoUrl: mediaUrl(row.photo as never),
      }));
  },

  activitiesForSpeaker: async (speakerId, locale) => {
    const payload = await getSystemPayload();
    const result = await payload
      .find({
        collection: 'sessions',
        where: { speakers: { in: [speakerId] } },
        locale,
        depth: 0,
        sort: 'startsAt',
        limit: 200,
        overrideAccess: true,
      })
      .catch(() => null);
    return ((result?.docs ?? []) as unknown as {
      id: number | string;
      title?: string | null;
      sessionType?: string | null;
      startsAt?: string | null;
    }[]).map(
      (row): SpeakerActivity => ({
        id: String(row.id),
        title: row.title ?? '',
        sessionType: row.sessionType ?? 'talk',
        startsAt: row.startsAt ?? undefined,
      }),
    );
  },
};

/* Reused by the session repository to resolve embedded speaker rows. */
export const resolveSpeakerRow = resolveRow;
export type { SpeakerRow };
