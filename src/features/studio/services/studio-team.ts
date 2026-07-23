import { teamRepository } from '@/infrastructure';
import type { AddTeamMemberInput, TeamMember } from '../types/team';

export const listTeamMembers = (): Promise<TeamMember[]> =>
  teamRepository.listMembers();

export const addTeamMember = (input: AddTeamMemberInput): Promise<TeamMember> =>
  teamRepository.addMember(input);

export const renameTeamMember = (id: string, name: string): Promise<void> =>
  teamRepository.updateMemberName(id, name);
