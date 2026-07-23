export interface StudioCreator {
  id: string;
  name: string;
  email: string;
}

export interface StudioIdentityGateway {
  currentCreator: (headers: Headers) => Promise<StudioCreator | null>;
}

export interface OrganizationSummary {
  id: string;
  name: string;
}

export interface OrganizationRepository {
  currentOrganization: () => Promise<OrganizationSummary | null>;
  renameOrganization: (name: string) => Promise<void>;
}

export interface ProfileRepository {
  updateName: (name: string) => Promise<void>;
}
