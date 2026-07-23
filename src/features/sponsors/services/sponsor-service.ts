import { sponsorRepository } from '@/infrastructure';
import type { CreateSponsorInput, SponsorSummary } from '../types/sponsor';

export const listSponsors = (slug: string): Promise<SponsorSummary[]> =>
  sponsorRepository.listByEvent(slug);

export const addSponsor = (
  slug: string,
  input: CreateSponsorInput,
): Promise<SponsorSummary> => sponsorRepository.create(slug, input);
