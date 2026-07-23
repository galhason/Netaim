import { z } from 'zod';

export const sponsorGridContentSchema = z.object({
  heading: z.string().optional(),
  sponsors: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      tier: z.string().optional(),
      logoUrl: z.string().optional(),
      logoAlt: z.string().optional(),
    }),
  ),
});
