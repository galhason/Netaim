import { z } from 'zod';

export const contentSceneSchema = z.object({
  heading: z.string().optional(),
  body: z.string(),
});
