import { z } from 'zod';

export const imageMediaSchema = z.object({
  url: z.string(),
  alt: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});

export const videoMediaSchema = z.object({
  url: z.string(),
  posterUrl: z.string().optional(),
});
