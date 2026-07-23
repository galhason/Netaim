import type { ContentSource } from '@/features/events';
import type {
  HomepageCompositionWriter,
  HomepageContentSource,
  HomepageContentWriter,
} from '@/features/opening/types/homepage-content';
import type { TeamRepository } from '@/features/studio/types/team';
import type {
  EventRepository,
  MediaRepository,
  PeopleRepository,
  SceneContentRepository,
  PublicEventRepository,
} from '@/features/events/types/event-repository';
import type {
  OrganizationRepository,
  ProfileRepository,
  StudioIdentityGateway,
} from '@/features/studio/types/creator';
import { demoContentSource } from '@/features/events/services/demo-content-source';
import { isDemoContentEnabled } from '@/features/events/constants/demo';
import type {
  ProductionLogSource,
} from '@/features/studio/types/activity';
import type {
  AccountSearchSource,
  ParticipantAdminSource,
  ParticipantAdminWriter,
} from '@/features/studio/types/participants';
import { payloadProductionLog } from './payload/payload-activity';
import {
  payloadListParticipantsAdmin,
  payloadSearchAccounts,
  payloadUpdateParticipantAdmin,
  payloadDeleteParticipantAccount,
} from './payload/payload-participant-admin';
import { chooseContentSource } from './selection';
import { payloadContentSource } from './payload/payload-content-source';
import { payloadIdentityGateway } from './payload/payload-identity';
import { payloadEventRepository } from './payload/payload-event-repository';
import { payloadPublicEventRepository } from './payload/payload-public-events';
import {
  payloadActiveConferenceSlug,
  payloadSetActiveConference,
} from './payload/payload-site';
import {
  payloadHomepageContent,
  payloadSaveHomepageComposition,
  payloadSaveHomepageContent,
} from './payload/payload-opening-page';
import { payloadTeamRepository } from './payload/payload-team';
import {
  payloadListPublicSpeakers,
  payloadMediaRepository,
  payloadPeopleRepository,
  payloadSceneContentRepository,
} from './payload/payload-people-media';
import {
  payloadOrganizationRepository,
  payloadProfileRepository,
} from './payload/payload-org-profile';
import {
  payloadListEventParticipants,
  payloadListPlatformParticipants,
  payloadRegistrationRepository,
  payloadRegistrationSettingsRepository,
} from './payload/payload-registration';
export type { FellowParticipant } from './payload/payload-registration';
import { payloadParticipantSessionRepository } from './payload/payload-participant-session';
import { payloadAccountGrantRepository } from './payload/payload-grant';
import { payloadNotificationOutboxRepository } from './payload/payload-notification';
import {
  payloadSessionRepository,
  payloadSessionRegistrationRepository,
} from './payload/payload-session';
import { payloadSpeakerRepository } from './payload/payload-speaker';
import { payloadSponsorRepository } from './payload/payload-sponsor';
import { payloadNetworkingProfileRepository } from './payload/payload-networking';
import { payloadConnectionRepository } from './payload/payload-networking-connection';
import { payloadChatRepository } from './payload/payload-networking-chat';
import type { ChatRepository } from '@/features/networking/types/chat';
import { payloadMeetingRepository } from './payload/payload-networking-meeting';
import { createMondayRegistrationSubscriber } from './monday/monday-registration-subscriber';
import type {
  SessionRepository,
  SessionRegistrationRepository,
} from '@/features/program/types/session';
import type { SpeakerRepository } from '@/features/speakers/types/speaker';
import type { SponsorRepository } from '@/features/sponsors/types/sponsor';
import type { NetworkingProfileRepository } from '@/features/networking/types/networking';
import type { ConnectionRepository } from '@/features/networking/types/connection';
import type { MeetingRepository } from '@/features/networking/types/meeting';
import { subscribeRegistration } from '@/foundation/event-bus';
import {
  createRegistrationNotifier,
  devChannel,
  type NotificationOutboxRepository,
} from '@/notification-engine';
import type {
  RegistrationRepository,
  RegistrationSettingsRepository,
} from '@/features/registration/types/registration';
import type { ParticipantSessionRepository } from '@/features/registration/types/identity';
import type { GrantRepository } from '@/features/access/types/grant';

/*
 * The composition root: the single place where product interfaces meet
 * their infrastructure implementations. Application services import
 * only this module; nothing above it may import Payload. Replacing
 * Payload means replacing the adapters wired here — nothing else.
 */
export { chooseContentSource } from './selection';
export const productionLog: ProductionLogSource = payloadProductionLog;
export const listParticipantsAdmin: ParticipantAdminSource =
  payloadListParticipantsAdmin;
export const updateParticipantAdmin: ParticipantAdminWriter =
  payloadUpdateParticipantAdmin;
export const deleteParticipantAdmin = payloadDeleteParticipantAccount;
export const searchParticipantAccounts: AccountSearchSource =
  payloadSearchAccounts;
export { readExperienceDocument } from './documents/experience-documents';

/*
 * Demo mode is a showcase, never a wall: a real conference the demo
 * source does not know falls through to the real data — so launching
 * and previewing actual events works with DEMO_CONTENT on.
 */
const demoWithRealFallback: ContentSource = {
  getEventExperience: async (query) =>
    (await demoContentSource.getEventExperience(query)) ??
    payloadContentSource.getEventExperience(query),
};

export const resolveContentSource = (): ContentSource =>
  chooseContentSource(
    isDemoContentEnabled(),
    demoWithRealFallback,
    payloadContentSource,
  );

export const identityGateway: StudioIdentityGateway = payloadIdentityGateway;

export const eventRepository: EventRepository = payloadEventRepository;
export const publicEventRepository: PublicEventRepository =
  payloadPublicEventRepository;

/*
 * The live-site pointer (which conference is the public website) and
 * the Studio write that flips it.
 */
export const activeConferenceSlug: () => Promise<string | null> =
  payloadActiveConferenceSlug;
export const setActiveConference: (slug: string | null) => Promise<void> =
  payloadSetActiveConference;
export const homepageContent: HomepageContentSource = payloadHomepageContent;
export const saveHomepageComposition: HomepageCompositionWriter =
  payloadSaveHomepageComposition;
export const saveHomepageContent: HomepageContentWriter =
  payloadSaveHomepageContent;
export const teamRepository: TeamRepository = payloadTeamRepository;

export const peopleRepository: PeopleRepository = payloadPeopleRepository;

export const listPublicSpeakers = payloadListPublicSpeakers;

export const mediaRepository: MediaRepository = payloadMediaRepository;

export const sceneContentRepository: SceneContentRepository =
  payloadSceneContentRepository;

export const organizationRepository: OrganizationRepository =
  payloadOrganizationRepository;

export const profileRepository: ProfileRepository = payloadProfileRepository;

export const listEventParticipants = payloadListEventParticipants;
export const listPlatformParticipants = payloadListPlatformParticipants;

export const registrationRepository: RegistrationRepository =
  payloadRegistrationRepository;

export const registrationSettingsRepository: RegistrationSettingsRepository =
  payloadRegistrationSettingsRepository;

export const participantSessionRepository: ParticipantSessionRepository =
  payloadParticipantSessionRepository;

export const accountGrantRepository: GrantRepository =
  payloadAccountGrantRepository;

export const notificationOutbox: NotificationOutboxRepository =
  payloadNotificationOutboxRepository;

export const sessionRepository: SessionRepository = payloadSessionRepository;

export const speakerRepository: SpeakerRepository = payloadSpeakerRepository;

export const sessionRegistrationRepository: SessionRegistrationRepository =
  payloadSessionRegistrationRepository;

export const sponsorRepository: SponsorRepository = payloadSponsorRepository;

export const networkingProfileRepository: NetworkingProfileRepository =
  payloadNetworkingProfileRepository;

export const connectionRepository: ConnectionRepository =
  payloadConnectionRepository;

export const chatRepository: ChatRepository = payloadChatRepository;

export const meetingRepository: MeetingRepository = payloadMeetingRepository;

/*
 * The Notification Engine subscribes to registration domain events here,
 * at the composition root — the Registration Engine emits without knowing
 * a subscriber exists (Platform-Engines §5.2).
 */
subscribeRegistration(
  'notification',
  createRegistrationNotifier(payloadNotificationOutboxRepository, devChannel),
);

/*
 * The monday.com integration subscribes to the same registration events
 * (the reserved outbound seam). It is inert unless MONDAY_* env is set.
 */
subscribeRegistration(
  'monday',
  createMondayRegistrationSubscriber(payloadParticipantSessionRepository),
);
