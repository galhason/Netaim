import { z } from 'zod';

export const ctaSchema = z.object({
  label: z.string(),
  href: z.string(),
});
