import { z } from 'zod';

export const sessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  description: z.string().optional(),
  room: z.string().optional(),
  track: z.string().optional(),
});
