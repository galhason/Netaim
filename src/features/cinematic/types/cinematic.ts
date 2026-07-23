import type { GuidingTone } from '@/shared';

export type CinematicIcon =
  | 'accessibility'
  | 'parking'
  | 'transit'
  | 'hotel'
  | 'leaf'
  | 'coffee'
  | 'scroll'
  | 'chevron';

export interface ArrivalScene {
  eyebrow: string;
  title: string;
  tagline: string;
  date: string;
  location: string;
  image?: string;
  /*
   * The invitation carries its own anticipation (Experience Engine v3):
   * the countdown target and the at-a-glance numbers live inside the
   * hero's glass panel.
   */
  startsAt?: string;
  facts?: WhyStatistic[];
  avatars?: string[];
}

export interface StoryScene {
  eyebrow: string;
  title: string;
  paragraph: string;
  image: string;
  values?: { icon: string; title: string; subtitle: string }[];
}

export interface WhyStatistic {
  value: string;
  label: string;
}

export interface WhyScene {
  quote: string;
  attribution: string;
  role: string;
  image: string;
  statistic?: WhyStatistic;
}

export interface MomentItem {
  image: string;
  caption: string;
}

export interface SpeakerItem {
  id?: string;
  name: string;
  role?: string;
  topic?: string;
  photo: string;
}

export interface ProgramItem {
  time: string;
  title: string;
  room?: string;
  speaker?: string;
}

export interface ProgramDay {
  label: string;
  theme?: string;
  description?: string;
  items: ProgramItem[];
}

export interface VenueFact {
  label: string;
  description?: string;
  icon: CinematicIcon;
}

export interface VenueScene {
  name: string;
  subtitle?: string;
  narrative: string;
  image: string;
  facts: VenueFact[];
}

export interface ClosingScene {
  line: string;
  image: string;
}

export interface CountdownScene {
  startsAt?: string;
}

export interface SponsorLogo {
  name: string;
  logoUrl?: string;
  website?: string;
}

export interface NavSection {
  id: string;
  label: Record<'he' | 'en', string>;
}

export interface FeaturedSessionItem {
  id: string;
  time: string;
  title: string;
  speaker?: string;
  typeLabel?: string;
  room?: string;
  image?: string;
}

export interface ConferenceExperience {
  composition?: {
    scene: string;
    hidden: boolean;
    variant?: string;
    density?: string;
    emphasis?: string;
  }[];
  meHref: string;
  registerHref: string;
  tone: GuidingTone;
  arrival: ArrivalScene;
  countdown: CountdownScene;
  facts: WhyStatistic[];
  story: StoryScene;
  why: WhyScene;
  moments: MomentItem[];
  speakers: SpeakerItem[];
  sponsors: SponsorLogo[];
  program: ProgramDay[];
  featuredSessions: FeaturedSessionItem[];
  venue: VenueScene;
  closing: ClosingScene;
}
