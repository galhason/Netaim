import { z } from 'zod';
import { imageMediaSchema } from './media';

export const venueContentSchema = z.object({
  label: z.string().optional(),
  heading: z.string().optional(),
  description: z.string().optional(),
  name: z.string(),
  address: z.string(),
  image: imageMediaSchema.optional(),
  mapUrl: z.string().optional(),
  mapLabel: z.string().optional(),
  details: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        value: z.string(),
      }),
    )
    .max(6)
    .optional(),
});
