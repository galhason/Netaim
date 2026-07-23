import type { ExperienceTypeDefinition } from '../types/experience';

/*
 * Experience types are registered, never hardcoded (Constitution v2
 * §2, §14): the platform asks what a type can do, not what it is.
 */
const types = new Map<string, ExperienceTypeDefinition>();

export const registerExperienceType = (
  definition: ExperienceTypeDefinition,
): void => {
  types.set(definition.id, definition);
};

export const resolveExperienceType = (
  id: string,
): ExperienceTypeDefinition | undefined => types.get(id);

export const experienceHasCapability = (
  id: string,
  capability: string,
): boolean =>
  resolveExperienceType(id)?.capabilities.includes(
    capability as ExperienceTypeDefinition['capabilities'][number],
  ) ?? false;
