import type { Locale } from '@/config/locales';
import type { SponsorTier } from '../types/sponsor';

export const SPONSOR_TIER_LABELS: Record<SponsorTier, Record<Locale, string>> = {
  platinum: { he: 'פלטינה', en: 'Platinum' },
  gold: { he: 'זהב', en: 'Gold' },
  silver: { he: 'כסף', en: 'Silver' },
  partner: { he: 'שותף', en: 'Partner' },
};

export const SPONSOR_TIER_RANK: Record<SponsorTier, number> = {
  platinum: 0,
  gold: 1,
  silver: 2,
  partner: 3,
};
