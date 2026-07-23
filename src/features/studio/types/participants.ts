/*
 * The Studio's view of a participant: who they are, where they
 * registered, and whether the door is open for them.
 */
export interface ParticipantRegistrationLine {
  eventTitle: string;
  eventSlug: string;
  status: string;
}

export interface ParticipantAdminView {
  id: string;
  name: string;
  email: string;
  organization?: string;
  blocked: boolean;
  registrations: ParticipantRegistrationLine[];
}

/*
 * A lighter cut for the access surface: any account on the platform,
 * findable by name or email, ready to receive a grant.
 */
export interface AccountSearchView {
  id: string;
  name: string;
  email: string;
  blocked: boolean;
}

export type AccountSearchSource = (
  query: string,
) => Promise<AccountSearchView[]>;

export type ParticipantAdminSource = () => Promise<ParticipantAdminView[]>;

export type ParticipantAdminWriter = (
  id: string,
  input: { name?: string; blocked?: boolean },
) => Promise<void>;
