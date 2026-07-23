import type { Locale } from '@/config/locales';
import type { EventNavigationItem } from '@/features/events';

export interface AttendeeCta {
  label: string;
  href: string;
}

export interface AttendeeWelcome {
  greeting: string;
  heading: string;
  countdownTarget: string;
  /* When the conference ends — lets the hero shift into its after-state. */
  endsAt?: string;
  countdownLabel: string;
  eventDateLabel: string;
  venueLine: string;
  primaryCta: AttendeeCta;
  secondaryCta?: AttendeeCta;
}

export interface AttendeeUpdate {
  id: string;
  dateLabel?: string;
  title: string;
  text: string;
}

export interface AttendeeMyEvent {
  label?: string;
  heading?: string;
  summary: string;
  statusLabel: string;
  statusValue: string;
  image?: { url: string; alt?: string };
  updates: AttendeeUpdate[];
}

export interface AttendeeDayMoment {
  id: string;
  startTime: string;
  endTime: string;
  title: string;
  description?: string;
  room?: string;
  saved?: boolean;
  kind?: 'session' | 'break';
  note?: string;
  /* v2.0: the timeline is real — day, voice and shape of each moment. */
  dayLabel?: string;
  speaker?: string;
  sessionType?: string;
}

export interface AttendeeMyDay {
  label?: string;
  heading?: string;
  intro?: string;
  savedLabel: string;
  moments: AttendeeDayMoment[];
}

export interface AttendeePerson {
  id: string;
  name: string;
  role?: string;
  photoUrl?: string;
  photoAlt?: string;
  reason: string;
}

export interface AttendeeNetworking {
  label?: string;
  heading?: string;
  intro?: string;
  people: AttendeePerson[];
}

export interface AttendeeEntranceDetail {
  id: string;
  label: string;
  value: string;
}

export interface AttendeeEntrance {
  label?: string;
  heading?: string;
  text?: string;
  qrValue: string;
  qrCaption: string;
  statusLabel: string;
  statusValue: string;
  details: AttendeeEntranceDetail[];
  offlineNote?: string;
}

export interface AttendeeResource {
  id: string;
  kindLabel: string;
  title: string;
  href?: string;
  pendingNote?: string;
}

export interface AttendeeAfter {
  label?: string;
  heading?: string;
  text?: string;
  resources: AttendeeResource[];
  nextEventLine?: string;
}

export interface AttendeeSpeaker {
  id: string;
  name: string;
  role?: string;
  photoUrl?: string;
}

export interface AttendeeExperienceContent {
  slug: string;
  brandName: string;
  speakers?: AttendeeSpeaker[];
  navigation: EventNavigationItem[];
  welcome: AttendeeWelcome;
  myEvent: AttendeeMyEvent;
  myDay: AttendeeMyDay;
  networking: AttendeeNetworking;
  entrance: AttendeeEntrance;
  after: AttendeeAfter;
}

export interface AttendeeContentQuery {
  slug: string;
  locale: Locale;
}

export interface AttendeeContentSource {
  getAttendeeExperience: (
    query: AttendeeContentQuery,
  ) => Promise<AttendeeExperienceContent | null>;
}
