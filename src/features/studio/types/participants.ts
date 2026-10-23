/*
 * The Studio's view of a participant: who they are, where they
 * registered, and whether the door is open for them.
 */
export interface ParticipantRegistrationLine {
  eventTitle: string;
  eventSlug: string;
  status: string;
  submittedAt?: string;
}

/* One activity the person holds or held a place at: a workshop, a tour, a vote on its language. */
export interface ParticipantActivityLine {
  sessionId: string;
  title: string;
  sessionType: string;
  startsAt?: string;
  eventSlug: string;
  status: string;
  language?: string;
}

export interface ParticipantAdminView {
  id: string;
  name: string;
  email: string;
  phone: string;
  /* The organisation and role the person wrote — not the platform's owning body. */
  organization?: string;
  role?: string;
  country?: string;
  dietary?: string;
  accessibility?: string;
  locale?: string;
  createdAt?: string;
  /* Listed in the participants directory: yes unless they said no. */
  listed: boolean;
  blocked: boolean;
  /* Whether the person has set a password at all — the Admin's form says so before offering a new one. */
  hasPassword: boolean;
  registrations: ParticipantRegistrationLine[];
  activities: ParticipantActivityLine[];
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

/* One account as the Admin's form needs it: what it says today, before it is changed. */
export interface ParticipantAccountView {
  id: string;
  email: string;
  phone: string;
}

export type ParticipantAccountReader = (id: string) => Promise<ParticipantAccountView | null>;

export type ParticipantAdminWriter = (
  id: string,
  input: { name?: string; blocked?: boolean; email?: string; phone?: string },
) => Promise<void>;
