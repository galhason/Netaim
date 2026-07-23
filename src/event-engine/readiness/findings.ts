import type { Locale } from '@/config/locales';

export type FindingSeverity = 'blocker' | 'warning' | 'advice';

export type FindingCategory =
  | 'content'
  | 'experience'
  | 'program'
  | 'venue'
  | 'registration'
  | 'localization'
  | 'media'
  | 'safety';

export interface Finding {
  id: string;
  severity: FindingSeverity;
  category: FindingCategory;
  message: Record<Locale, string>;
  action: Record<Locale, string>;
}
