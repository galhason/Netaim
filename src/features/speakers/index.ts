export {
  listConferenceSpeakers,
  listSpeakerLibrary,
  getSpeaker,
  createExternalSpeaker,
  createLinkedSpeaker,
  updateSpeaker,
  removeSpeaker,
  setSpeakerListed,
  mergeSpeakers,
  findSpeakerLookalikes,
  listSpeakerCandidates,
  activitiesForSpeaker,
} from './services/speaker-service';
export { sameSpeakerName, likelySameSpeaker } from './utils/speaker-names';
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
  SpeakerLookalikes,
  SpeakerPlacement,
  SpeakerRepository,
} from './types/speaker';
