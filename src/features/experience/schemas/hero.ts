import { z } from 'zod';
import { ctaSchema } from './cta';
import { imageMediaSchema, videoMediaSchema } from './media';

export const heroContentSchema = z.object({
  eyebrow: z.string().optional(),
  headline: z.string(),
  subheadline: z.string().optional(),
  description: z.string().optional(),
  badge: z.string().optional(),
  eventDate: z.string().optional(),
  eventLocation: z.string().optional(),
  scrollHintLabel: z.string().optional(),
  primaryCta: ctaSchema.optional(),
  secondaryCta: ctaSchema.optional(),
  backgroundImage: imageMediaSchema.optional(),
  backgroundVideo: videoMediaSchema.optional(),
});
