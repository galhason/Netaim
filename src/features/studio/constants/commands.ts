import type { StudioCommand } from '../types/command';

/*
 * Every meaningful Studio action is registered here so it can one day be
 * searched and invoked from the command palette (Objective 5). Surfaces
 * contribute their action to this list — that registration is the
 * integration point. Global actions are static; event-scoped actions are
 * contributed per event when the palette UI lands.
 */
export const STUDIO_COMMANDS: readonly StudioCommand[] = [
  {
    id: 'navigate.home',
    title: { he: 'בית', en: 'Home' },
    scope: 'navigate',
    keywords: ['home', 'בית', 'start', 'overview'],
    href: '/studio',
  },
  {
    id: 'navigate.events',
    title: { he: 'אירועים', en: 'Events' },
    scope: 'navigate',
    keywords: ['events', 'אירועים', 'event', 'workspace'],
    href: '/studio/events',
  },
  {
    id: 'navigate.organization',
    title: { he: 'הארגון', en: 'Organization' },
    scope: 'navigate',
    keywords: ['organization', 'הארגון', 'team', 'settings', 'brand'],
    href: '/studio/organization',
  },
  {
    id: 'create.event',
    title: { he: 'אירוע חדש', en: 'New event' },
    scope: 'create',
    keywords: ['new', 'create', 'event', 'אירוע', 'חדש', 'ליצור'],
    href: '/studio/events',
  },
] as const;
