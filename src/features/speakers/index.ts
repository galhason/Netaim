export {
  listConferenceSpeakers,
  getSpeaker,
  createExternalSpeaker,
  createLinkedSpeaker,
  updateSpeaker,
  listSpeakerCandidates,
  activitiesForSpeaker,
} from './services/speaker-service';
export type {
  ResolvedSpeaker,
  SpeakerCandidate,
  SpeakerSocialLink,
  ExternalSpeakerInput,
  SpeakerOverrides,
  SpeakerActivity,
  SpeakerRepository,
} from './types/speaker';
