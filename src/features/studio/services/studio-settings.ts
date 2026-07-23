import {
  organizationRepository,
  profileRepository,
} from '@/infrastructure';
import type { OrganizationSummary } from '../types/creator';

export const currentOrganization = (): Promise<OrganizationSummary | null> =>
  organizationRepository.currentOrganization();

export const renameOrganization = (name: string): Promise<void> =>
  organizationRepository.renameOrganization(name);

export const updateCreatorName = (name: string): Promise<void> =>
  profileRepository.updateName(name);
