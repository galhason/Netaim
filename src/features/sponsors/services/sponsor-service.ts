import { sponsorRepository } from '@/infrastructure';
import type {
  CreateSponsorInput,
  SponsorSummary,
  UpdateSponsorInput,
} from '../types/sponsor';

export const listSponsors = (slug: string): Promise<SponsorSummary[]> =>
  sponsorRepository.listByEvent(slug);

/*
 * A new partner joins at the end of the strip: its order is one past the
 * last, so the list the organiser sees is the list the site shows.
 */
export const addSponsor = async (
  slug: string,
  input: CreateSponsorInput,
): Promise<SponsorSummary> => {
  const existing = await sponsorRepository.listByEvent(slug);
  const last = existing.reduce((max, item) => Math.max(max, item.order), -1);
  return sponsorRepository.create(slug, {
    ...input,
    order: input.order ?? last + 1,
  });
};

export const updateSponsor = (
  id: string,
  input: UpdateSponsorInput,
): Promise<SponsorSummary | null> => sponsorRepository.update(id, input);

export const removeSponsor = (id: string): Promise<boolean> =>
  sponsorRepository.remove(id);

/*
 * Moving one partner a step earlier or later. The strip's order is the
 * `order` number, and a list built by hand over time can carry gaps and
 * ties, so the move renumbers the whole list 0..n-1 in its new order
 * rather than swapping two numbers that might be equal.
 */
export const moveSponsor = async (
  slug: string,
  id: string,
  direction: 'up' | 'down',
): Promise<SponsorSummary[]> => {
  const list = await sponsorRepository.listByEvent(slug);
  const index = list.findIndex((item) => item.id === id);
  if (index === -1) {
    return list;
  }
  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= list.length) {
    return list;
  }
  const next = [...list];
  [next[index], next[target]] = [next[target]!, next[index]!];
  await Promise.all(
    next.map((item, order) =>
      item.order === order
        ? Promise.resolve(null)
        : sponsorRepository.update(item.id, { order }),
    ),
  );
  return next.map((item, order) => ({ ...item, order }));
};
