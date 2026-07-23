import type { Locale } from '@/config/locales';
import {
  applyTransition,
  computeCapacity,
  decideOutcome,
  promotable,
  type CapacityView,
  type RegistrationStatus,
} from '@/registration-engine';
import { emitRegistration } from '@/foundation/event-bus';
import {
  sessionRegistrationRepository,
  sessionRepository,
} from '@/infrastructure';
import { currentParticipant } from '@/features/registration';
import type {
  CreateSessionInput,
  SessionCounts,
  SessionRegistrationSummary,
  SessionSummary,
} from '../types/session';
import {
  workshopStatus,
  type WorkshopStatus,
} from '../constants/workshop-status';

export interface SessionSituation {
  session: SessionSummary;
  counts: SessionCounts;
  capacity: CapacityView;
  status: WorkshopStatus;
}

export interface ConferenceActivity {
  session: SessionSummary;
  counts: SessionCounts;
  capacity: CapacityView;
  status: WorkshopStatus;
}

/*
 * Every activity of a conference with its live capacity view and status,
 * derived — never stored. One agenda read, then the counts per activity;
 * the Capacity Engine turns them into available seats and the band.
 */
export const listConferenceActivities = async (
  slug: string,
  locale: Locale,
): Promise<ConferenceActivity[]> => {
  const sessions = await sessionRepository.listByEvent(slug, locale);
  return Promise.all(
    sessions.map(async (session) => {
      const counts = await sessionRepository.countsBySession(session.id);
      const capacity = computeCapacity({
        limit: session.capacity,
        confirmed: counts.confirmed,
        pending: counts.pending,
        waitlisted: counts.waitlisted,
      });
      return {
        session,
        counts,
        capacity,
        status: workshopStatus(capacity, session.waitlistEnabled),
      };
    }),
  );
};

export const listAgenda = (
  slug: string,
  locale: Locale,
): Promise<SessionSummary[]> => sessionRepository.listByEvent(slug, locale);

export const createSession = (
  slug: string,
  locale: Locale,
  input: CreateSessionInput,
): Promise<SessionSummary> => sessionRepository.create(slug, input, locale);

export const updateSession = (
  sessionId: string,
  locale: Locale,
  input: Partial<CreateSessionInput>,
): Promise<SessionSummary | null> =>
  sessionRepository.update(sessionId, input, locale);

export const deleteSession = (sessionId: string): Promise<boolean> =>
  sessionRepository.remove(sessionId);

export const getSessionSituation = async (
  sessionId: string,
  locale: Locale,
): Promise<SessionSituation | null> => {
  const session = await sessionRepository.getById(sessionId, locale);
  if (!session) {
    return null;
  }
  const counts = await sessionRepository.countsBySession(sessionId);
  const capacity = computeCapacity({
    limit: session.capacity,
    confirmed: counts.confirmed,
    pending: counts.pending,
    waitlisted: counts.waitlisted,
  });
  return {
    session,
    counts,
    capacity,
    status: workshopStatus(capacity, session.waitlistEnabled),
  };
};

/*
 * Workshop selection — the two-step registration's second step. Open
 * capacity: an instant place until full, then the waiting list when the
 * session enables it. Double selection is prevented; the frozen engine
 * decides the outcome and the waitlist position.
 */
const overlaps = (
  a: { startsAt?: string; endsAt?: string },
  b: { startsAt?: string; endsAt?: string },
): boolean => {
  const startA = Date.parse(a.startsAt ?? '');
  const startB = Date.parse(b.startsAt ?? '');
  if (Number.isNaN(startA) || Number.isNaN(startB)) {
    return false;
  }
  /* a missing end means the activity holds its whole hour */
  const endA = Date.parse(a.endsAt ?? '') || startA + 60 * 60 * 1000;
  const endB = Date.parse(b.endsAt ?? '') || startB + 60 * 60 * 1000;
  return startA < endB && startB < endA;
};

export const selectWorkshop = async (
  sessionId: string,
  locale: Locale,
): Promise<SessionRegistrationSummary> => {
  const participant = await currentParticipant();
  if (!participant) {
    throw new Error('Sign-in required');
  }
  const existing = await sessionRegistrationRepository.find(
    sessionId,
    participant.id,
  );
  if (existing && existing.status !== 'cancelled') {
    return existing;
  }
  const situation = await getSessionSituation(sessionId, locale);
  if (!situation) {
    throw new Error('Session not found');
  }
  /*
   * The critical business rule (PRD §3.2): one person, one place in a
   * time window. Any active selection overlapping the requested one
   * blocks the registration — the guest resolves the clash, not fate.
   */
  if (situation.session.eventSlug) {
    const [agenda, mine] = await Promise.all([
      sessionRepository.listByEvent(situation.session.eventSlug, locale),
      sessionRegistrationRepository.listForParticipant(
        situation.session.eventSlug,
        participant.id,
      ),
    ]);
    const sessionsById = new Map(agenda.map((entry) => [entry.id, entry]));
    const clash = mine.some((registration) => {
      if (
        registration.status === 'cancelled' ||
        registration.sessionId === sessionId
      ) {
        return false;
      }
      const other = sessionsById.get(registration.sessionId);
      return other ? overlaps(situation.session, other) : false;
    });
    if (clash) {
      throw new Error('conflict');
    }
  }
  const outcome = decideOutcome('open', situation.capacity);
  if (outcome === 'waitlisted' && !situation.session.waitlistEnabled) {
    throw new Error('Workshop is full');
  }
  const status: RegistrationStatus =
    outcome === 'waitlisted' ? 'waitlisted' : 'confirmed';
  const waitlistPosition =
    outcome === 'waitlisted' ? situation.counts.waitlisted + 1 : null;
  return sessionRegistrationRepository.registerParticipant(
    sessionId,
    participant.id,
    status,
    waitlistPosition,
  );
};

const nowIso = (): string => new Date().toISOString();

/*
 * When a confirmed seat is released the next guest in line is promoted —
 * the free seat never lingers. The engine decides how many seats reopened
 * (Capacity Engine) and who is first (Waitlist Engine, strict FIFO); this
 * layer only persists the transition and emits the promotion so the
 * Notification Engine can tell the guest. Each promotion is independent —
 * one failing never blocks the rest, nor the cancellation that triggered
 * it.
 */
const promoteWaitlist = async (
  session: SessionSummary,
  slug: string | undefined,
): Promise<void> => {
  if (!session.waitlistEnabled) {
    return;
  }
  const counts = await sessionRegistrationRepository.countsBySession(session.id);
  const capacity = computeCapacity({
    limit: session.capacity,
    confirmed: counts.confirmed,
    pending: counts.pending,
    waitlisted: counts.waitlisted,
  });
  const freed =
    capacity.available === null ? counts.waitlisted : capacity.available;
  if (freed <= 0) {
    return;
  }
  const waiting = await sessionRegistrationRepository.waitlistForSession(
    session.id,
  );
  const participantByRegistration = new Map(
    waiting.map((entry) => [entry.registrationId, entry.participantId]),
  );
  /* the Waitlist Engine picks the first `freed` in strict FIFO order */
  const promoted = promotable(
    waiting.map((entry) => ({
      registrationId: entry.registrationId,
      position: entry.position,
    })),
    freed,
  );
  for (const entry of promoted) {
    const transition = applyTransition('waitlisted', 'confirmed');
    if (!transition.ok) {
      continue;
    }
    await sessionRegistrationRepository.setStatus(
      entry.registrationId,
      'confirmed',
    );
    const participantId = participantByRegistration.get(entry.registrationId);
    if (slug && participantId) {
      await emitRegistration({
        type: 'registration.promoted',
        registrationId: entry.registrationId,
        participantId,
        eventSlug: slug,
        occurredAt: nowIso(),
      });
    }
  }
};

export const leaveWorkshop = async (
  sessionId: string,
  locale: Locale,
): Promise<SessionRegistrationSummary | null> => {
  const participant = await currentParticipant();
  if (!participant) {
    throw new Error('Sign-in required');
  }
  const existing = await sessionRegistrationRepository.find(
    sessionId,
    participant.id,
  );
  if (!existing) {
    return null;
  }
  const result = applyTransition(existing.status, 'cancelled');
  if (!result.ok) {
    return existing;
  }
  const freedSeat = existing.status === 'confirmed';
  const cancelled = await sessionRegistrationRepository.setStatus(
    existing.id,
    result.status,
  );

  const session = await sessionRepository.getById(sessionId, locale);
  const slug = session?.eventSlug;
  if (slug) {
    await emitRegistration({
      type: 'registration.cancelled',
      registrationId: existing.id,
      participantId: participant.id,
      eventSlug: slug,
      occurredAt: nowIso(),
    });
  }
  /* only a released confirmed seat reopens the line */
  if (freedSeat && session) {
    await promoteWaitlist(session, slug);
  }
  return cancelled;
};

export const myWorkshops = async (
  slug: string,
): Promise<SessionRegistrationSummary[]> => {
  const participant = await currentParticipant();
  if (!participant) {
    return [];
  }
  return sessionRegistrationRepository.listForParticipant(slug, participant.id);
};

/*
 * The guest's own activities, sorted into the four states that matter to
 * them: what's ahead, what they're waiting for, what has passed, and what
 * they let go. Status decides the state; time only separates an upcoming
 * confirmed seat from a completed one. When the same activity was left and
 * taken again, the liveliest registration wins so it never shows twice.
 */
export type ActivityCategory =
  | 'upcoming'
  | 'waiting'
  | 'completed'
  | 'cancelled';

export interface MyActivity {
  registrationId: string;
  session: SessionSummary;
  status: RegistrationStatus;
  category: ActivityCategory;
  waitlistPosition?: number;
}

export interface MyActivities {
  upcoming: MyActivity[];
  waiting: MyActivity[];
  completed: MyActivity[];
  cancelled: MyActivity[];
}

/* Liveliness for dedupe: a held seat outranks a queue outranks a close. */
const STATUS_RANK: Record<RegistrationStatus, number> = {
  confirmed: 5,
  attended: 4,
  pending: 3,
  waitlisted: 3,
  noShow: 2,
  cancelled: 1,
  declined: 1,
  expired: 1,
};

const hasEnded = (session: SessionSummary, now: number): boolean => {
  const end = Date.parse(session.endsAt ?? session.startsAt ?? '');
  return !Number.isNaN(end) && end < now;
};

const categorize = (
  status: RegistrationStatus,
  session: SessionSummary,
  now: number,
): ActivityCategory => {
  if (status === 'waitlisted' || status === 'pending') {
    return 'waiting';
  }
  if (status === 'attended') {
    return 'completed';
  }
  if (status === 'confirmed') {
    return hasEnded(session, now) ? 'completed' : 'upcoming';
  }
  return 'cancelled';
};

const startMs = (session: SessionSummary): number => {
  const value = Date.parse(session.startsAt ?? '');
  return Number.isNaN(value) ? Number.POSITIVE_INFINITY : value;
};

export const myActivities = async (
  slug: string,
  locale: Locale,
  now: number = Date.now(),
): Promise<MyActivities> => {
  const [registrations, agenda] = await Promise.all([
    myWorkshops(slug),
    sessionRepository.listByEvent(slug, locale),
  ]);
  const sessionsById = new Map(agenda.map((session) => [session.id, session]));

  /* keep the liveliest registration per activity */
  const chosen = new Map<string, SessionRegistrationSummary>();
  for (const registration of registrations) {
    if (!sessionsById.has(registration.sessionId)) {
      continue;
    }
    const held = chosen.get(registration.sessionId);
    if (
      !held ||
      STATUS_RANK[registration.status] > STATUS_RANK[held.status]
    ) {
      chosen.set(registration.sessionId, registration);
    }
  }

  const buckets: MyActivities = {
    upcoming: [],
    waiting: [],
    completed: [],
    cancelled: [],
  };
  for (const registration of chosen.values()) {
    const session = sessionsById.get(registration.sessionId);
    if (!session) {
      continue;
    }
    const category = categorize(registration.status, session, now);
    buckets[category].push({
      registrationId: registration.id,
      session,
      status: registration.status,
      category,
      waitlistPosition: registration.waitlistPosition,
    });
  }

  buckets.upcoming.sort((a, b) => startMs(a.session) - startMs(b.session));
  buckets.waiting.sort((a, b) => startMs(a.session) - startMs(b.session));
  buckets.completed.sort((a, b) => startMs(b.session) - startMs(a.session));
  buckets.cancelled.sort((a, b) => startMs(b.session) - startMs(a.session));
  return buckets;
};
