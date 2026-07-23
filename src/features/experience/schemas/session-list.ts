import { z } from 'zod';
import { sessionSchema } from './session';

export const sessionListContentSchema = z.object({
  heading: z.string().optional(),
  sessions: z.array(sessionSchema),
});
