import type { Locale } from '@/config/locales';
import { registrationRepository } from '@/infrastructure';
import { listPortalEvents } from '@/features/events';
import type { PortalEvent } from '@/features/events';
import {
  cancelRegistration,
  currentParticipant,
  registerForEvent,
} from '@/features/registration';
import { findScheduleConflict } from '@/registration-engine';
import type { ConferenceWindow, RegistrationStatus } from '@/registration-engine';
import { formatLongDate } from '@/shared';
import type { AccountConference, AccountOverview, JoinOutcome } from '../types/account';

/*
 * A registration that still occupies the guest's calendar. Cancelled,
 * declined and expired places release the slot and never block a join.
 */
const ACTIVE_STATUSES: readonly RegistrationStatus[] = [
  'pending',
  'confirmed',
  'waitlisted',
  'attended',
];

const toWindow = (event: PortalEvent): ConferenceWindow => ({
  slug: event.slug,
  title: event.title,
  startsAt: event.startsAt ?? '',
  endsAt: event.endsAt ?? null,
});

const toConference = (
  event: PortalEvent,
  locale: Locale,
  status: RegistrationStatus | null,
): AccountConference => ({
  slug: event.slug,
  title: event.title,
  startsAt: event.startsAt,
  endsAt: event.endsAt,
  location: event.location,
  dateLabel: formatLongDate(event.startsAt, locale),
  posterUrl: event.posterUrl,
  status,
});

interface Holding {
  event: PortalEvent;
  status: RegistrationStatus | null;
  registrationId: string | null;
}

const readHoldings = async (
  participantId: string,
  locale: Locale,
): Promise<Holding[]> => {
  const events = await listPortalEvents(locale).catch(() => []);
  return Promise.all(
    events.map(async (event) => {
      const held = await registrationRepository
        .statusForParticipant(event.slug, participantId)
        .catch(() => null);
      return {
        event,
        status: held?.status ?? null,
        registrationId: held?.registrationId ?? null,
      };
    }),
  );
};

const isActive = (status: RegistrationStatus | null): boolean =>
  status !== null && ACTIVE_STATUSES.includes(status);

/*
 * The account's own view of the platform: the conferences this guest
 * holds, and the conferences still open to them — each already knowing
 * whether the guest's calendar allows joining.
 */
export const getMyAccount = async (
  locale: Locale,
): Promise<AccountOverview | null> => {
  const participant = await currentParticipant();
  if (!participant) {
    return null;
  }

  const holdings = await readHoldings(participant.id, locale);
  const heldWindows = holdings
    .filter((holding) => isActive(holding.status))
    .map((holding) => toWindow(holding.event));

  const joined = holdings
    .filter((holding) => isActive(holding.status))
    .map((holding) => toConference(holding.event, locale, holding.status));

  const available = holdings
    .filter((holding) => !isActive(holding.status))
    .map((holding) => {
      const conflict = findScheduleConflict(
        toWindow(holding.event),
        heldWindows,
      );
      const conference = toConference(holding.event, locale, null);
      return conflict
        ? { ...conference, conflictWith: conflict.title }
        : conference;
    });

  return {
    id: participant.id,
    name: participant.name,
    email: participant.email,
    joined,
    available,
  };
};

/*
 * Joining a conference from the account. The schedule rule is enforced
 * here, at the seam, before any registration is created.
 */
export const joinConference = async (
  slug: string,
  locale: Locale,
): Promise<JoinOutcome> => {
  const participant = await currentParticipant();
  if (!participant) {
    return { ok: false, reason: 'signed-out' };
  }

  const holdings = await readHoldings(participant.id, locale);
  const target = holdings.find((holding) => holding.event.slug === slug);
  if (!target) {
    return { ok: false, reason: 'unavailable' };
  }
  if (isActive(target.status)) {
    return { ok: true, status: target.status as RegistrationStatus };
  }

  const heldWindows = holdings
    .filter((holding) => isActive(holding.status))
    .map((holding) => toWindow(holding.event));
  const conflict = findScheduleConflict(toWindow(target.event), heldWindows);
  if (conflict) {
    return { ok: false, reason: 'conflict', conflictTitle: conflict.title };
  }

  const result = await registerForEvent(slug, locale, {
    name: participant.name,
    email: participant.email,
  });
  return { ok: true, status: result.outcome as RegistrationStatus };
};

export const leaveConference = async (slug: string): Promise<boolean> => {
  const participant = await currentParticipant();
  if (!participant) {
    return false;
  }
  const held = await registrationRepository
    .statusForParticipant(slug, participant.id)
    .catch(() => null);
  if (!held) {
    return false;
  }
  await cancelRegistration(slug, held.registrationId);
  return true;
};

/*
 * The schedule rule for the per-conference form (Identity Build Brief
 * WP5 gap): a signed-in guest holding an overlapping conference is
 * refused before any registration is created. Anonymous visitors pass —
 * they hold nothing yet.
 */
export const scheduleConflictFor = async (
  slug: string,
  locale: Locale,
): Promise<string | null> => {
  const participant = await currentParticipant();
  if (!participant) {
    return null;
  }
  const holdings = await readHoldings(participant.id, locale);
  const target = holdings.find((holding) => holding.event.slug === slug);
  if (!target || isActive(target.status)) {
    return null;
  }
  const heldWindows = holdings
    .filter((holding) => isActive(holding.status))
    .map((holding) => toWindow(holding.event));
  const conflict = findScheduleConflict(toWindow(target.event), heldWindows);
  return conflict ? conflict.title : null;
};
