import { z } from 'zod';

export const registrationCtaContentSchema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string().optional(),
  text: z.string().optional(),
  label: z.string(),
  href: z.string(),
  note: z.string().optional(),
});
