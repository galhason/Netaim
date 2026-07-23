export interface ProfileLink {
  label: string;
  url: string;
}

export interface NetworkingProfileSummary {
  id: string;
  participantId: string;
  participantName: string;
  headline?: string;
  bio?: string;
  interests?: string;
  links: ProfileLink[];
  visible: boolean;
  availableForMeetings: boolean;
}

export interface SaveProfileInput {
  headline?: string;
  bio?: string;
  interests?: string;
  links: ProfileLink[];
  visible: boolean;
  availableForMeetings: boolean;
}

export interface NetworkingProfileRepository {
  listVisible: (slug: string) => Promise<NetworkingProfileSummary[]>;
  getForParticipant: (
    slug: string,
    participantId: string,
  ) => Promise<NetworkingProfileSummary | null>;
  upsert: (
    slug: string,
    participantId: string,
    input: SaveProfileInput,
  ) => Promise<NetworkingProfileSummary>;
}
