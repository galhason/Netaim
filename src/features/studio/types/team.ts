export interface TeamMember {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

export interface AddTeamMemberInput {
  name: string;
  email: string;
  password: string;
  role: string;
}

export interface TeamRepository {
  listMembers: () => Promise<TeamMember[]>;
  addMember: (input: AddTeamMemberInput) => Promise<TeamMember>;
  updateMemberName: (id: string, name: string) => Promise<void>;
}
