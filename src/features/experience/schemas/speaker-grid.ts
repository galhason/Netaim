import { z } from 'zod';

export const speakerGridContentSchema = z.object({
  label: z.string().optional(),
  heading: z.string().optional(),
  intro: z.string().optional(),
  speakers: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      role: z.string().optional(),
      photoUrl: z.string().optional(),
      photoAlt: z.string().optional(),
    }),
  ),
});
