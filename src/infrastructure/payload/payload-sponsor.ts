import { relationshipId } from '@/auth';
import { SPONSOR_TIER_RANK } from '@/features/sponsors/constants/sponsor-labels';
import type {
  SponsorRepository,
  SponsorSummary,
  SponsorTier,
  UpdateSponsorInput,
} from '@/features/sponsors/types/sponsor';
import { actorContext, getSystemPayload } from './payload-context';

interface SponsorRow {
  id: number | string;
  name?: string;
  tier?: SponsorTier;
  logo?: unknown;
  website?: string | null;
  description?: string | null;
  order?: number | null;
  organization?: number | string | { id: number | string };
  event?: number | string | { id: number | string };
}

const logoUrlOf = (value: unknown): string | undefined => {
  if (value && typeof value === 'object' && 'url' in value) {
    const url = (value as { url?: unknown }).url;
    return typeof url === 'string' ? url : undefined;
  }
  return undefined;
};

const logoIdOf = (value: unknown): string | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === 'object' && 'id' in value) {
    return String((value as { id: number | string }).id);
  }
  return typeof value === 'number' || typeof value === 'string'
    ? String(value)
    : undefined;
};

const toSponsor = (row: SponsorRow): SponsorSummary => ({
  id: String(row.id),
  name: row.name ?? '',
  tier: row.tier ?? 'partner',
  logoId: logoIdOf(row.logo),
  logoUrl: logoUrlOf(row.logo),
  website: row.website ?? undefined,
  description: row.description ?? undefined,
  order: row.order ?? 0,
});

export const payloadSponsorRepository: SponsorRepository = {
  listByEvent: async (slug) => {
    const payload = await getSystemPayload();
    const event = await payload.find({
      collection: 'events',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    const eventRow = event.docs[0] as { id: number | string } | undefined;
    if (!eventRow) {
      return [];
    }
    const result = await payload.find({
      collection: 'sponsors',
      where: { event: { equals: eventRow.id } },
      depth: 1,
      pagination: false,
      overrideAccess: true,
    });
    return (result.docs as unknown as SponsorRow[])
      .map(toSponsor)
      .sort(
        (a, b) =>
          a.order - b.order ||
          SPONSOR_TIER_RANK[a.tier] - SPONSOR_TIER_RANK[b.tier] ||
          a.name.localeCompare(b.name),
      );
  },

  create: async (slug, input) => {
    const context = await actorContext();
    if (!context) {
      throw new Error('Sign-in required');
    }
    const { payload, user } = context;
    const result = await payload.find({
      collection: 'events',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
      overrideAccess: false,
      user,
    });
    const eventRow = result.docs[0] as
      | {
          id: number | string;
          organization: number | string | { id: number | string };
        }
      | undefined;
    if (!eventRow) {
      throw new Error('Event not found');
    }
    const doc = await payload.create({
      collection: 'sponsors',
      data: {
        organization: Number(relationshipId(eventRow.organization)),
        event: Number(eventRow.id),
        name: input.name,
        tier: input.tier,
        website: input.website,
        description: input.description,
        order: input.order ?? 0,
        ...(input.logoId ? { logo: Number(input.logoId) } : {}),
      },
      overrideAccess: false,
      user,
    });
    return toSponsor(doc as unknown as SponsorRow);
  },

  update: async (id, input) => {
    const context = await actorContext();
    if (!context) {
      throw new Error('Sign-in required');
    }
    const { payload, user } = context;
    const data: Record<string, unknown> = {};
    const copy = (key: keyof UpdateSponsorInput) => {
      if (input[key] !== undefined) {
        data[key] = input[key];
      }
    };
    copy('name');
    copy('tier');
    copy('website');
    copy('description');
    copy('order');
    if (input.logoId !== undefined) {
      data.logo = input.logoId === '' ? null : Number(input.logoId);
    }
    const updated = await payload
      .update({
        collection: 'sponsors',
        id,
        data,
        depth: 1,
        overrideAccess: false,
        user,
      })
      .catch(() => null);
    return updated ? toSponsor(updated as unknown as SponsorRow) : null;
  },

  remove: async (id) => {
    const context = await actorContext();
    if (!context) {
      throw new Error('Sign-in required');
    }
    const { payload, user } = context;
    const deleted = await payload
      .delete({ collection: 'sponsors', id, overrideAccess: false, user })
      .catch(() => null);
    return deleted !== null;
  },
};
