import type { z } from 'zod';
import type { ctaSchema } from '../schemas/cta';
import type { imageMediaSchema, videoMediaSchema } from '../schemas/media';
import type { heroContentSchema } from '../schemas/hero';
import type { storyContentSchema } from '../schemas/story';
import type { contentSceneSchema } from '../schemas/content';
import type { agendaContentSchema } from '../schemas/agenda';
import type { sessionListContentSchema } from '../schemas/session-list';
import type { speakerGridContentSchema } from '../schemas/speaker-grid';
import type { venueContentSchema } from '../schemas/venue';
import type { sponsorGridContentSchema } from '../schemas/sponsor-grid';
import type { faqContentSchema } from '../schemas/faq';
import type { registrationCtaContentSchema } from '../schemas/registration-cta';
import type { sessionSchema } from '../schemas/session';

export type CtaContent = z.infer<typeof ctaSchema>;
export type ImageMedia = z.infer<typeof imageMediaSchema>;
export type VideoMedia = z.infer<typeof videoMediaSchema>;
export type SessionItem = z.infer<typeof sessionSchema>;
export type HeroContent = z.infer<typeof heroContentSchema>;
export type StoryContent = z.infer<typeof storyContentSchema>;
export type ContentSceneContent = z.infer<typeof contentSceneSchema>;
export type AgendaContent = z.infer<typeof agendaContentSchema>;
export type SessionListContent = z.infer<typeof sessionListContentSchema>;
export type SpeakerGridContent = z.infer<typeof speakerGridContentSchema>;
export type VenueContent = z.infer<typeof venueContentSchema>;
export type SponsorGridContent = z.infer<typeof sponsorGridContentSchema>;
export type FaqContent = z.infer<typeof faqContentSchema>;
export type RegistrationCtaContent = z.infer<
  typeof registrationCtaContentSchema
>;
