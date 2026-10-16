import { relationshipId } from '@/auth';
import type { Locale } from '@/config/locales';
import type {
  ResolvedSpeaker,
  SpeakerActivity,
  SpeakerRepository,
  SpeakerSocialLink,
} from '@/features/speakers/types/speaker';
import { resolveSpeakerIdentity } from '@/features/speakers/services/speaker-identity';
import { sameSpeakerName } from '@/features/speakers/utils/speaker-names';
import { actorContext, getSystemPayload } from './payload-context';
import { mediaId, mediaUrl } from './payload-media';
import { conferenceRoster, relationIds } from './payload-speaker-roster';

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
  events?: unknown;
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
    .filter((link) => link.url !== '');

/*
 * The resolution point for the platform's own pages. The identity rule
 * itself -- account lends, overrides win, legacy `role` stands in for an
 * empty jobTitle -- lives in `resolveSpeakerIdentity`, shared with the
 * marketing API so the two can never disagree about who a speaker is.
 * What is decided here is only what this shape adds: the links, and the
 * account facts that must never leave the platform. Bio default (from
 * the account's networking profile) is filled only where it is needed —
 * see getById.
 */
const resolveRow = (row: SpeakerRow): ResolvedSpeaker => {
  const account = accountOf(row);
  const identity = resolveSpeakerIdentity(row);
  return {
    id: String(row.id),
    name: identity.name,
    jobTitle: identity.jobTitle,
    company: identity.company,
    bio: identity.bio,
    photoUrl: mediaUrl(identity.photo as never),
    socialLinks: toLinks(row.socialLinks),
    isRegistered: Boolean(account ?? row.account),
    accountId:
      account?.id != null
        ? String(account.id)
        : row.account != null
          ? String(row.account)
          : undefined,
    own: {
      name: clean(row.name),
      jobTitle: clean(row.jobTitle) ?? clean(row.role),
      company: clean(row.company),
      bio: clean(row.bio),
      photoId: mediaId(row.photo as never),
    },
  };
};

type PayloadInstance = Awaited<ReturnType<typeof getSystemPayload>>;

const eventBySlug = async (
  payload: PayloadInstance,
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
  payload: PayloadInstance,
  id: string,
  locale: Locale,
  fallback = true,
): Promise<SpeakerRow | null> => {
  const doc = await payload
    .findByID({
      collection: 'speakers',
      id,
      locale,
      ...(fallback ? {} : { fallbackLocale: false as const }),
      depth: 2,
      overrideAccess: true,
    })
    .catch(() => null);
  return doc ? (doc as unknown as SpeakerRow) : null;
};

const asNumber = (id: string | number): number => Number(id);

/* The conferences a card lists by hand, as ids. */
const listedOn = (row: SpeakerRow): string[] => relationIds(row.events);

/*
 * A card already in the organisation that this one would only repeat:
 * the same account, or — for a guest — the same name, letter for letter
 * once spacing and punctuation are set aside.
 */
const existingCard = async (
  payload: PayloadInstance,
  organization: number,
  locale: Locale,
  match: { accountId?: string; name?: string },
): Promise<SpeakerRow | null> => {
  if (match.accountId) {
    const found = await payload
      .find({
        collection: 'speakers',
        where: { and: [{ organization: { equals: organization } }, { account: { equals: match.accountId } }] },
        locale,
        depth: 2,
        limit: 1,
        sort: 'id',
        overrideAccess: true,
      })
      .catch(() => null);
    return (found?.docs[0] as SpeakerRow | undefined) ?? null;
  }
  const wanted = sameSpeakerName(match.name ?? '');
  if (!wanted) {
    return null;
  }
  const guests = await payload
    .find({
      collection: 'speakers',
      where: { and: [{ organization: { equals: organization } }, { account: { exists: false } }] },
      locale,
      depth: 2,
      pagination: false,
      sort: 'id',
      overrideAccess: true,
    })
    .catch(() => null);
  return (
    ((guests?.docs ?? []) as unknown as SpeakerRow[]).find(
      (row) => sameSpeakerName(row.name ?? '') === wanted,
    ) ?? null
  );
};

/* Adds or takes off one conference from a card's hand-made listing. */
const writeListing = async (
  payload: PayloadInstance,
  row: SpeakerRow,
  eventId: string,
  listed: boolean,
): Promise<void> => {
  const current = listedOn(row);
  const next = listed
    ? [...new Set([...current, eventId])]
    : current.filter((id) => id !== eventId);
  if (next.length === current.length && next.every((id) => current.includes(id))) {
    return;
  }
  await payload.update({
    collection: 'speakers',
    id: row.id,
    data: { events: next.map(asNumber) },
    depth: 0,
    overrideAccess: true,
  });
};

const WORDS = ['name', 'jobTitle', 'company', 'bio', 'role'] as const;

export const payloadSpeakerRepository: SpeakerRepository = {
  listByEvent: async (slug, locale, options) => {
    const payload = await getSystemPayload();
    const event = await eventBySlug(payload, slug);
    if (!event) {
      return [];
    }
    const roster = await conferenceRoster(payload, event.id);
    const result = await payload.find({
      collection: 'speakers',
      where: roster.where,
      locale,
      ...(options?.fallback === false ? { fallbackLocale: false as const } : {}),
      depth: 2,
      sort: 'name',
      pagination: false,
      overrideAccess: true,
    });
    const eventId = String(event.id);
    return (result.docs as unknown as SpeakerRow[]).map((row) => ({
      ...resolveRow(row),
      presence: {
        listed: listedOn(row).includes(eventId),
        activities: roster.activities.get(String(row.id)) ?? 0,
      },
    }));
  },

  listLibrary: async (locale, options) => {
    const context = await actorContext();
    if (!context) {
      return [];
    }
    const { payload, user } = context;
    const result = await payload
      .find({
        collection: 'speakers',
        locale,
        ...(options?.fallback === false ? { fallbackLocale: false as const } : {}),
        depth: 2,
        sort: 'name',
        pagination: false,
        overrideAccess: false,
        user,
      })
      .catch(() => null);
    const rows = (result?.docs ?? []) as unknown as SpeakerRow[];
    if (rows.length === 0) {
      return [];
    }
    /* The conferences each card is on: by hand, or through an activity. */
    const sessions = await payload
      .find({
        collection: 'sessions',
        where: { and: [{ speakers: { exists: true } }, { archivedAt: { exists: false } }] },
        depth: 0,
        pagination: false,
        overrideAccess: false,
        user,
        select: { speakers: true, event: true },
      })
      .catch(() => null);
    const through = new Map<string, Set<string>>();
    for (const session of (sessions?.docs ?? []) as { speakers?: unknown; event?: unknown }[]) {
      const eventId = relationIds([session.event])[0];
      if (!eventId) continue;
      for (const id of relationIds(session.speakers)) {
        through.set(id, (through.get(id) ?? new Set()).add(eventId));
      }
    }
    const events = await payload
      .find({
        collection: 'events',
        locale,
        depth: 0,
        pagination: false,
        overrideAccess: false,
        user,
        select: { slug: true, title: true },
      })
      .catch(() => null);
    const eventById = new Map(
      ((events?.docs ?? []) as { id: number | string; slug?: string | null; title?: string | null }[]).map(
        (event) => [String(event.id), { slug: event.slug ?? '', title: event.title ?? event.slug ?? '' }],
      ),
    );
    return rows.map((row) => {
      const on = new Set([...listedOn(row), ...(through.get(String(row.id)) ?? [])]);
      return {
        ...resolveRow(row),
        conferences: [...on]
          .map((id) => eventById.get(id))
          .filter((event): event is { slug: string; title: string } => Boolean(event)),
      };
    });
  },

  getById: async (id, locale, options) => {
    const payload = await getSystemPayload();
    const row = await readSpeaker(payload, id, locale, options?.fallback !== false);
    if (!row) {
      return null;
    }
    const resolved = resolveRow(row);
    /*
     * Bio default: the linked account's own bio, resolved only here (the
     * speaker page) and never in list paths. An override always wins.
     *
     * This used to read the speaker's networking profile for this one
     * conference, which meant a speaker at two events could have a bio
     * on one page and none on the other, from the same person. The bio
     * is the account's now, so there is one to find.
     */
    if (!resolved.bio && resolved.accountId && options?.fallback !== false) {
      const account = await payload
        .findByID({
          collection: 'participants',
          id: resolved.accountId,
          depth: 0,
          overrideAccess: true,
        })
        .catch(() => null);
      const bio = (account as { bio?: string | null } | null)?.bio;
      if (bio) {
        resolved.bio = bio.trim() || undefined;
      }
    }
    return resolved;
  },

  createExternal: async (input, locale, placement) => {
    const context = await actorContext();
    if (!context) {
      throw new Error('Sign-in required');
    }
    const { payload, user } = context;
    const event = await eventBySlug(payload, placement.slug);
    if (!event) {
      throw new Error('Event not found');
    }
    const organization = Number(relationshipId(event.organization as never));
    /* One person, one card: the same name already in the library is that card. */
    const existing = placement.force
      ? null
      : await existingCard(payload, organization, locale, { name: input.name });
    if (existing) {
      if (placement.listOn) {
        await writeListing(payload, existing, String(event.id), true);
      }
      const full = await readSpeaker(payload, String(existing.id), locale);
      return resolveRow(full ?? existing);
    }
    const doc = await payload.create({
      collection: 'speakers',
      data: {
        organization,
        ...(placement.listOn ? { events: [Number(event.id)] } : {}),
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

  createLinked: async (accountId, overrides, locale, placement) => {
    const context = await actorContext();
    if (!context) {
      throw new Error('Sign-in required');
    }
    const { payload, user } = context;
    const event = await eventBySlug(payload, placement.slug);
    if (!event) {
      throw new Error('Event not found');
    }
    const organization = Number(relationshipId(event.organization as never));
    /* one card per account in the organisation: reuse, never duplicate */
    const found = await existingCard(payload, organization, locale, { accountId });
    if (found) {
      if (placement.listOn) {
        await writeListing(payload, found, String(event.id), true);
      }
      const full = await readSpeaker(payload, String(found.id), locale);
      return resolveRow(full ?? found);
    }
    const doc = await payload.create({
      collection: 'speakers',
      data: {
        organization,
        ...(placement.listOn ? { events: [Number(event.id)] } : {}),
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

  setListed: async (id, slug, listed) => {
    const context = await actorContext();
    if (!context) {
      throw new Error('Sign-in required');
    }
    const { payload, user } = context;
    const event = await eventBySlug(payload, slug);
    /* Read as the actor, so a card of another organisation is not found. */
    const row = await payload
      .findByID({ collection: 'speakers', id, depth: 0, overrideAccess: false, user })
      .catch(() => null);
    if (!event || !row) {
      return false;
    }
    await writeListing(payload, row as unknown as SpeakerRow, String(event.id), listed);
    return true;
  },

  merge: async (keepId, foldId) => {
    const context = await actorContext();
    if (!context) {
      throw new Error('Sign-in required');
    }
    const { payload, user } = context;
    if (keepId === foldId) {
      return null;
    }
    const [keep, fold] = await Promise.all(
      [keepId, foldId].map((id) =>
        payload.findByID({ collection: 'speakers', id, depth: 0, overrideAccess: false, user }).catch(() => null),
      ),
    );
    if (!keep || !fold) {
      return null;
    }
    const keepRow = keep as unknown as SpeakerRow & { organization?: unknown; photo?: unknown };
    const foldRow = fold as unknown as SpeakerRow & { organization?: unknown; photo?: unknown };
    const keepAccount = relationIds([keepRow.account])[0];
    const foldAccount = relationIds([foldRow.account])[0];
    if (
      relationIds([keepRow.organization])[0] !== relationIds([foldRow.organization])[0] ||
      (keepAccount && foldAccount && keepAccount !== foldAccount)
    ) {
      return null;
    }

    /* The activities: the folded card's become the kept one's, once each. */
    const sessions = await payload.find({
      collection: 'sessions',
      where: { speakers: { in: [foldId] } },
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: { speakers: true },
    });
    for (const session of sessions.docs as { id: number | string; speakers?: unknown }[]) {
      const ids = relationIds(session.speakers).map((id) => (id === foldId ? keepId : id));
      await payload.update({
        collection: 'sessions',
        id: session.id,
        data: { speakers: [...new Set(ids)].map(asNumber) },
        depth: 0,
        overrideAccess: true,
      });
    }

    /* The card: the conferences of both, every link of both once, and whatever words or picture the kept one lacked. */
    const keepLinks = toLinks(keepRow.socialLinks);
    const newLinks = toLinks(foldRow.socialLinks).filter(
      (link) => !keepLinks.some((held) => held.url === link.url),
    );
    await payload.update({
      collection: 'speakers',
      id: keepId,
      data: {
        events: [...new Set([...listedOn(keepRow), ...listedOn(foldRow)])].map(asNumber),
        ...(keepAccount || !foldAccount ? {} : { account: Number(foldAccount) }),
        ...(mediaId(keepRow.photo as never) || !mediaId(foldRow.photo as never)
          ? {}
          : { photo: Number(mediaId(foldRow.photo as never)) }),
        ...(newLinks.length === 0
          ? {}
          : { socialLinks: [...keepLinks, ...newLinks].map((link) => ({ label: link.label, url: link.url })) }),
      },
      depth: 0,
      overrideAccess: true,
    });
    for (const locale of ['he', 'en'] as const) {
      const [kept, folded] = await Promise.all([
        readSpeaker(payload, keepId, locale, false),
        readSpeaker(payload, foldId, locale, false),
      ]);
      const fill = Object.fromEntries(
        WORDS.filter((key) => !clean(kept?.[key]) && clean(folded?.[key])).map((key) => [key, clean(folded?.[key])]),
      );
      if (Object.keys(fill).length > 0) {
        await payload.update({ collection: 'speakers', id: keepId, data: fill, locale, depth: 0, overrideAccess: true });
      }
    }
    await payload.delete({ collection: 'speakers', id: foldId, overrideAccess: true });
    const full = await readSpeaker(payload, keepId, 'he');
    return full ? resolveRow(full) : null;
  },

  remove: async (id) => {
    const context = await actorContext();
    if (!context) {
      throw new Error('Sign-in required');
    }
    const { payload, user } = context;
    const deleted = await payload
      .delete({ collection: 'speakers', id, overrideAccess: false, user })
      .catch(() => null);
    return deleted !== null;
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

  activitiesForSpeaker: async (speakerId, locale, slug) => {
    const payload = await getSystemPayload();
    const event = slug ? await eventBySlug(payload, slug) : null;
    if (slug && !event) {
      return [];
    }
    const result = await payload
      .find({
        collection: 'sessions',
        where: {
          and: [
            { speakers: { in: [speakerId] } },
            { archivedAt: { exists: false } },
            ...(event ? [{ event: { equals: event.id } }] : []),
          ],
        },
        locale,
        depth: 0,
        sort: 'startsAt',
        pagination: false,
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
