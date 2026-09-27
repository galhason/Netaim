export const SPONSOR_TIERS = ['platinum', 'gold', 'silver', 'partner'] as const;

export type SponsorTier = (typeof SPONSOR_TIERS)[number];

export const isSponsorTier = (value: string): value is SponsorTier =>
  (SPONSOR_TIERS as readonly string[]).includes(value);

/*
 * A partner: an organisation whose logo the conference shows. The site
 * calls them "שותפים"; the collection keeps its older name, `sponsors`,
 * and its tier, which the partners strip on the WordPress page ignores.
 */
export interface SponsorSummary {
  id: string;
  name: string;
  tier: SponsorTier;
  logoId?: string;
  logoUrl?: string;
  website?: string;
  description?: string;
  order: number;
}

export interface CreateSponsorInput {
  name: string;
  tier: SponsorTier;
  website?: string;
  description?: string;
  order?: number;
  /* A media id; the picture itself is uploaded through the media library. */
  logoId?: string;
}

/* What an edit may change. `logoId: ''` clears the logo. */
export interface UpdateSponsorInput {
  name?: string;
  tier?: SponsorTier;
  website?: string;
  description?: string;
  order?: number;
  logoId?: string;
}

export interface SponsorRepository {
  listByEvent: (slug: string) => Promise<SponsorSummary[]>;
  create: (slug: string, input: CreateSponsorInput) => Promise<SponsorSummary>;
  update: (id: string, input: UpdateSponsorInput) => Promise<SponsorSummary | null>;
  remove: (id: string) => Promise<boolean>;
}
