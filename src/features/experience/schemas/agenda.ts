import { z } from 'zod';
import { sessionSchema } from './session';

export const agendaContentSchema = z.object({
  label: z.string().optional(),
  heading: z.string().optional(),
  intro: z.string().optional(),
  days: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        sessions: z.array(sessionSchema),
      }),
    )
    .min(1),
});
