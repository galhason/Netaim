# Development Report 02

Covering: Task 1.3 (Experience Engine Core) through Experience Sprint 01
Date: 2026-07-13

## Summary

The platform moved from architecture to a living product. The Experience Engine core was implemented (registry, resolver, validation, lazy loading, per-scene error isolation), the first scene library shipped, the full request-to-render pipeline works end to end with locale routing, states, preview foundation and a development demo event, and the visual identity was established and applied across seven chapters: Arrival, Purpose, Day, People, Venue, FAQ, Join. The Master Direction (permanent creative direction) was adopted and documented.

## Completed Features

Experience Engine core (plugin scene types, Zod content validation, graceful degradation, code-splitting); platform logging strategy (transport-based, single sanctioned console); scene library (10 registered types); event route `/[locale]/events/[slug]` with loading/error/not-found and draft-mode preview foundation; demo content source (double-guarded, development only); event header with CMS-driven navigation, locale switcher and logo mark; Icon primitive wrapping lucide-react; visual identity (Jerusalem-stone tokens, Frank Ruhl Libre + Heebo via next/font, motion grammar with Motion for React); seven styled chapters per Master Direction with alternating composition rhythm and continuity treatments (hero exit dissolve, letterboxing, shared threshold motif).

## Changed Files

New/extended modules: `src/experience-engine/` (resolver, loader, validation, error boundary, renderer with anchor wrappers), `src/shared/` (logging, Icon), `src/features/experience/` (schemas, types, utils, scene components incl. hero/story/agenda/people/venue/common subfolders), `src/features/events/` (content sources, application service, header, demo fixture, hero-media util), event route files, `globals.css` (tokens, fonts, smooth anchors), `public/demo/` placeholder assets. Documentation: Experience-Engine, Event-Experience-Flow, Hero-Scene, Purpose-Scene, Agenda-Scene, Art-Direction-01, Master-Direction, Experience-Sprint-01.

## Architecture Decisions

1. Definition-based scene registration superseded the Sprint 0 stub (lazy loading + validation required it; documented in Experience-Engine.md).
2. Content flows only through the ContentSource contract behind an application service; routes never touch Payload.
3. Renderer wraps scenes with their ids — engine-level anchor navigation.
4. `EventExperienceContent` carries `brandName` (organization) and `navigation`; Payload source serves empty navigation until CMS nav modeling.
5. Session times formatted as authored wall-clock (UTC-pinned); event timezone modeling deferred to Event Engine.
6. One shared motion grammar (`scene-motion.ts`) across all scenes.
7. Dependencies approved by use: `motion`, `lucide-react` (wrapped in Icon primitive).

## New Components

ExperienceRenderer, SceneErrorBoundary, EventHeader, LogoMark, Icon, SceneHeader, and the chapter components (Hero× 6 subcomponents, Story×5, Agenda×2, SpeakerPortrait, VenueDetails, Join, FAQ).

## CMS Changes

`Scenes.content` (json, localized) added. Scene content contracts (Zod) extended per chapter — all optional-field extensions. Structured per-type CMS fields remain planned for the CMS authoring sprint (CMS-Blueprint §3).

## Database Changes

None applied (no live DB yet). Schema will materialize via Payload on first run.

## Known Issues

1. Dependencies must be installed locally (`npm install`) and git init run on Windows (sandbox mount blocks git locking).
2. Payload content path untested against a live PostgreSQL (deployment/local DB decision pending).
3. Mobile navigation menu deferred — nav hidden below `md` pending an approved pattern.
4. Demo photography is generated placeholders; Experience Profile (per-event atmosphere) not yet modeled.
5. No automated test framework (decision pending); verification is scripted-manual per task.

## Risks

Content/logic boundary erosion as registration approaches (mitigated by scene contracts); tenancy scoping not yet enforced (must land before multi-org data); placeholder scenes remaining for unused types (content, session-list, sponsor-grid) if an event enables them before styling.

## Next Sprint (proposed)

Registration flow foundation (Join scene → real registration, Registration Engine contract), or CMS authoring sprint (per-type structured fields, nav modeling, Payload admin customization decision §9.2). Product Owner call.

## Questions Before Next Task

Still open: Platform-Engines §8 approvals, full role matrix, CMS UI strategy, deployment environment, test framework, mobile navigation pattern.
