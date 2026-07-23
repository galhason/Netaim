/*
 * The Experience Engine's public surface — the scene system that renders a
 * conference's public pages from CMS content (hero, story, agenda,
 * speakers, venue…). Scenes register themselves through
 * registerExperienceScenes; the shared header, portraits, motion variants
 * and time formatter are the pieces individual scenes compose.
 */
export { SCENE_TYPES } from './constants/scene-types';
export type { ExperienceSceneType } from './constants/scene-types';
export { registerExperienceScenes } from './services/register-scenes';
export { formatSessionTime } from './utils/format-session-time';
export { sceneItem, sceneSequence, sceneThreshold } from './utils/scene-motion';
export { default as SceneHeader } from './components/common/scene-header';
export { default as SpeakerPortrait } from './components/people/speaker-portrait';
export { default as VenueDetails } from './components/venue/venue-details';
