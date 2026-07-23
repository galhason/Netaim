import { registerExperienceType } from '@/experience-runtime';
import './conference-scenes';
import './opening-scenes';

/*
 * The platform's scene catalog: importing this module registers every
 * Scene Package and every Experience Type. Pages import it for its
 * side effect before rendering through the Runtime — the Registry is
 * the only wiring (Constitution v2, Phase 1 DoD).
 */
registerExperienceType({
  id: 'homepage',
  capabilities: ['hero', 'story', 'moments', 'portalWall'],
});

registerExperienceType({
  id: 'conference',
  capabilities: [
    'hero',
    'story',
    'moments',
    'agenda',
    'speakers',
    'venue',
    'registration',
    'sponsors',
    'networking',
  ],
});
