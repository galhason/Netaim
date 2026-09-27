export {
  listConferenceSpeakers,
  getSpeaker,
  createExternalSpeaker,
  createLinkedSpeaker,
  updateSpeaker,
  removeSpeaker,
  listSpeakerCandidates,
  activitiesForSpeaker,
} from './services/speaker-service';
export { resolveSpeakerIdentity } from './services/speaker-identity';
export type {
  SpeakerIdentity,
  SpeakerIdentitySource,
} from './services/speaker-identity';
export type {
  ResolvedSpeaker,
  SpeakerCandidate,
  SpeakerSocialLink,
  ExternalSpeakerInput,
  SpeakerOverrides,
  SpeakerActivity,
  SpeakerRepository,
} from './types/speaker';
