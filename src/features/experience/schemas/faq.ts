import { z } from 'zod';

export const faqContentSchema = z.object({
  label: z.string().optional(),
  heading: z.string().optional(),
  items: z
    .array(
      z.object({
        id: z.string(),
        question: z.string(),
        answer: z.string(),
      }),
    )
    .min(1),
});
