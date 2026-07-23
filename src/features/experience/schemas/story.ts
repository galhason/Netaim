import { z } from 'zod';
import { ctaSchema } from './cta';
import { imageMediaSchema } from './media';

export const storyContentSchema = z.object({
  label: z.string().optional(),
  heading: z.string().optional(),
  paragraphs: z.array(z.string()).min(1),
  quote: z
    .object({
      text: z.string(),
      attribution: z.string().optional(),
    })
    .optional(),
  keyNumbers: z
    .array(
      z.object({
        value: z.string(),
        label: z.string(),
      }),
    )
    .max(4)
    .optional(),
  image: imageMediaSchema.optional(),
  cta: ctaSchema.optional(),
});
