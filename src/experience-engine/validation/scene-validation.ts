import type { ZodType } from 'zod';

export type SceneContentValidation<TContent> =
  | { valid: true; content: TContent }
  | { valid: false; issues: string[] };

export const validateSceneContent = <TContent>(
  schema: ZodType<TContent>,
  content: unknown,
): SceneContentValidation<TContent> => {
  const result = schema.safeParse(content);

  if (result.success) {
    return { valid: true, content: result.data };
  }

  return {
    valid: false,
    issues: result.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`,
    ),
  };
};
