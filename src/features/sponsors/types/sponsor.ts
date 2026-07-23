export const SPONSOR_TIERS = ['platinum', 'gold', 'silver', 'partner'] as const;

export type SponsorTier = (typeof SPONSOR_TIERS)[number];

export const isSponsorTier = (value: string): value is SponsorTier =>
  (SPONSOR_TIERS as readonly string[]).includes(value);

export interface SponsorSummary {
  id: string;
  name: string;
  tier: SponsorTier;
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
}

export interface SponsorRepository {
  listByEvent: (slug: string) => Promise<SponsorSummary[]>;
  create: (slug: string, input: CreateSponsorInput) => Promise<SponsorSummary>;
}
