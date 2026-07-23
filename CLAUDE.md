# Hason Platform

This project is governed by docs/CONSTITUTION.md. Read it before any work.

## Documentation Location

All project documents (Development Reports, architecture decisions, specs, QA docs) live in docs/. Never create documentation elsewhere.

## Non-negotiables

- Architecture before features. If architecture is missing, stop and design it first.
- Nothing hardcoded — all content (titles, scenes, agenda, speakers, sponsors, languages, settings) comes from the CMS.
- Events → Experiences → Scenes. Scenes are dynamic, CMS-driven, configurable in order and type.
- Production-level code only. No TODOs, console.log, dead code, inline styles, magic numbers, decorative comments, or emoji in source.
- Feature folder structure is fixed: components/ hooks/ services/ types/ schemas/ utils/ constants/ index.ts
- Responsive (desktop/tablet/mobile/landscape) and accessible (keyboard, semantic HTML, ARIA, contrast, focus, reduced motion) are mandatory.
- Target: 600 concurrent users. Performance and security first.

## Decision Policy

If a product, UX, or architectural decision is not explicitly defined: stop, present options, wait for approval. Never guess.

## Project Memory

Before every Sprint:

1. Read the latest Development Reports in docs/reports/.
2. Review existing architecture and prior decisions.
3. Extend the system — never replace or rewrite approved code without justification.

Development Reports are generated every two Sprints (see docs/CONSTITUTION.md §22).
