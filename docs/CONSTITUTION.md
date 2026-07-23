# Hason Platform — Development Constitution v1.0

Project Codename: Hason
Status: Active Development
Version: 1.0

## 1. Vision

Hason is a modern Event Experience Platform designed for government, public-sector, nonprofit, and private organizations that organize conferences, educational events, professional gatherings, and national initiatives.

The platform is not a conference website. It is a scalable product for creating immersive event experiences while providing a complete event management platform.

Every architectural and UX decision must reinforce this vision.

## 2. Product Philosophy

Always build a product. Never build pages.

Every feature must solve a real user problem. Every component must be reusable. Every decision must improve the long-term architecture.

## 3. Experience Philosophy

Users should feel that they have already entered the event before registration. The Event Experience is part of the product.

Scrolling is not navigation. Scrolling is a journey.

Every event is composed of dynamic scenes. Scenes tell a story.

Never think in pages. Always think in experiences.

## 4. Architecture Philosophy

Architecture always comes before features. Never implement a feature if the underlying architecture is missing.

Prefer extensibility over shortcuts. The platform must support future events without architectural changes.

Everything must be event-driven. Nothing should be hardcoded for a single conference.

## 5. CMS Philosophy

Everything that may change in the future must be managed by the CMS.

Never hardcode: titles, descriptions, buttons, images, hero content, agenda, speakers, sponsors, scenes, settings, languages.

Everything should be configurable.

## 6. Experience Engine

- Each Event contains one Experience.
- Each Experience contains multiple Scenes.
- Scenes are rendered dynamically.
- Scene order is configurable.
- Scene types are configurable.
- Scene content comes from CMS.
- Never hardcode scene sequences.

## 7. Clean Code Rules

Always write production-level code. Never write prototype, temporary, or unfinished code. Never duplicate logic.

Prefer composition, reusable components, and readable code over clever code.

## 8. Comments Policy

Do NOT write decorative comments.

Forbidden:

```
// Hero Section
// Beautiful animation
// Button
```

Allowed: comments explaining architectural decisions, business rules, or technical constraints.

If code is self-explanatory, do not comment it.

## 9. Forbidden Code

- No emoji inside source code
- No banner comments
- No ASCII art
- No TODO left in production
- No console.log
- No dead code
- No unused imports
- No duplicated types
- No duplicated utilities
- No inline styles
- No magic numbers
- No giant components

## 10. Folder Standards

Every feature follows exactly the same structure:

```
feature/
  components/
  hooks/
  services/
  types/
  schemas/
  utils/
  constants/
  index.ts
```

Never invent custom folder structures.

## 11. Naming Standards

Use descriptive names.

Good: RegistrationForm, ParticipantDashboard, WorkshopCard, EventTimeline

Bad: test.tsx, NewButton2, Temp.tsx

## 12. UI Philosophy

Never build UI before UX. Every screen must have a clear purpose and a primary action.

Avoid unnecessary visual complexity. Motion must support usability. Never animate for decoration only.

## 13. Responsive Philosophy

All features must work across desktop, tablet, mobile, and landscape. No desktop-only implementations.

## 14. Accessibility

Accessibility is mandatory: keyboard support, proper semantic HTML, ARIA where needed, contrast compliance, focus states, reduced motion support.

## 15. Performance

The platform must feel fast.

Target: support 600 concurrent active users. Architecture must support future scaling.

Lazy loading where appropriate, image optimization, efficient rendering, avoid unnecessary re-renders.

## 16. Security

Authentication first. Authorization first.

Never trust client-side validation. Validate everything. Use least-privilege permissions. Sensitive actions must be logged.

## 17. Documentation Rules

Documentation is part of development.

Every two Sprints create a Development Report. Every architectural decision must be documented. Every new module must be documented. No undocumented architecture changes.

## 18. Sprint Workflow

Specification → UX Review → Architecture Validation → Implementation → QA → Documentation → Approval → Done

## 19. Definition of Done

A Sprint is complete only when:

- No TypeScript errors
- No ESLint errors
- No duplicated code
- No temporary code
- No debugging code
- Documentation updated
- Architecture preserved
- Responsive verified
- Accessibility verified
- QA completed

## 20. Stability First

Approved features should not change unless: a bug exists, architecture requires it, or the Product Owner explicitly requests it.

Never introduce breaking changes without approval.

## 21. Decision Policy

If implementation requires a product, UX, or architectural decision that is not explicitly defined:

Stop. Do not invent behavior. Explain the available options. Wait for approval. Never guess.

## 22. Development Reports

Every two Sprints generate a Development Report containing:

- Summary
- Completed Features
- Changed Files
- Architecture Decisions
- New Components
- CMS Changes
- Database Changes
- Known Issues
- Risks
- Next Sprint

## 23. Project Constitution

Every implementation must respect:

- Experience First
- Product Before Features
- Dynamic by Default
- Reusable Everything
- One Source of Truth
- Motion with Purpose
- Performance First
- Clean Architecture
- Documentation Mandatory
- Zero Technical Debt
- Stability First

## 24. Project Memory

Claude must treat every Sprint as a continuation of an existing system, never a fresh start.

Before every Sprint:

1. Read the latest Development Reports.
2. Review the existing architecture.
3. Understand which decisions have already been made.
4. Extend the system — never replace it.
5. Never rewrite approved code without justification.

This preserves continuity across months of development.
