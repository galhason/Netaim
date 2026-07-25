import type { Locale } from '@/config/locales';
import {
  findEvent,
  findPortalEvent,
  isDemoContentEnabled,
  listSpeakersPublic,
} from '@/features/events';
import { listDirectory } from '@/features/networking';
import { listEventParticipants } from '@/infrastructure';
import { listMyAnnouncements } from '@/features/notifications';
import { listAgenda, myWorkshops } from '@/features/program';
import {
  currentParticipant,
  getParticipantRegistration,
} from '@/features/registration';
import { demoAttendeeSource } from './demo-attendee-source';
import { buildParticipantExperience } from './participant-experience-builder';
import type { AttendeeExperienceContent } from '../types/attendee-experience';

/*
 * The personal area resolves the signed-in participant's real
 * registration first (Registration Engine), then lights the Lounge from
 * every engine that already knows this event: the portal (image, date,
 * venue), the program (timeline + the guest's workshops), the outbox
 * (updates) and the networking directory (people to meet). Each source
 * fails soft — a missing engine dims one card, never the room.
 */
export const getAttendeeExperience = async (
  slug: string,
  locale: Locale,
): Promise<AttendeeExperienceContent | null> => {
  const registration = await getParticipantRegistration(slug).catch(() => null);
  if (registration) {
    const [
      event,
      portal,
      participant,
      agenda,
      workshops,
      notifications,
      directory,
      attendees,
      speakers,
    ] = await Promise.all([
      findEvent(slug).catch(() => null),
      findPortalEvent(slug, locale).catch(() => null),
      currentParticipant().catch(() => null),
      listAgenda(slug, locale).catch(() => []),
      myWorkshops(slug).catch(() => []),
      listMyAnnouncements(slug).catch(() => []),
      listDirectory(slug).catch(() => []),
      listEventParticipants(slug).catch(() => []),
      listSpeakersPublic().catch(() => []),
    ]);
    return buildParticipantExperience({
      slug,
      locale,
      event,
      portal,
      agenda,
      workshops,
      notifications,
      directory,
      attendees,
      speakers,
      participantId: participant?.id,
      participantEmail: participant?.email,
      participantName: registration.participantName,
      status: registration.status,
      entranceToken: registration.entranceToken,
    });
  }

  if (!isDemoContentEnabled()) {
    return null;
  }

  return demoAttendeeSource.getAttendeeExperience({ slug, locale });
};
