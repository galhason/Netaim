# Hason Studio — Workspace Architecture (Release 0.8)

Status: Approved for implementation 2026-07-15
Owner: Senior Product Architect
Depends on: Studio-Vision.md, Studio-Information-Architecture.md, Studio-User-Flows.md, Studio-Core.md, Development-Report-07.md
Realizes: the navigation, Home, search and empty-state promises already approved in the IA, which Studio Core (0.7) shipped as flat stubs.

## 1. What 0.8 is

Release 0.8 is the *experience* layer over the delivered Studio Core. It changes no engine, no repository, no access rule, and no application-service contract. It turns a set of correct screens into one continuous workspace. The measure is not features; it is whether the organizer ever wonders "where am I?" and whether the interface disappears after eight hours of use.

This document is the frozen reference the implementation follows. Nothing here overrides an approved decision; it completes decisions the IA already made but the code had stubbed.

## 2. Navigation is a journey, not a menu

Two layers, each with one job:

- **Studio chrome (global).** The wordmark, the five areas (Home, Events, Library, Insights, Organization), the language choice, the creator. Present on every Studio surface. This is *place*, not action.
- **Scope line (breadcrumb).** A single calm line naming where the creator stands: `Studio › Events › {event}` or `Studio › Events › {event} › {area}`. It is a reading line and a set of return links, never a nested menu. It is the answer to "where am I," rendered on every workspace surface.

Within an event, navigation stops being top tabs and becomes a **stable side journey** — the workspace's spine. The journey is the organizer's chronology, top to bottom: Overview → Experience → People → Venue → Media → Launch (define → build → people → place → open). The order never reorders under the user; the active area is always marked (`aria-current`); the phase's creative focus sits at the head of the journey so the surface always states what this moment is for.

Rule: **the user should rarely return Home.** Everything reachable from where they are. Home is a starting point and a resting point, not a hub one bounces through.

## 3. The Event Workspace

Entering an event opens a workspace, not a record. Its shape:

```
scope line        Studio › Events › {event}
event identity    title · phase · this-moment focus (one line)
─────────────────────────────────────────────
side journey │ area surface
Overview     │ (the selected area renders here)
Experience   │
People       │
Venue        │
Media        │
Launch       │
```

The side journey is a persistent nav landmark. On desktop it is a start-side rail; on narrow widths it collapses above the surface as a wrapping row (see §6). The journey labels are product language and bilingual constants — never route segments, never English inside Hebrew.

Reserved journey stops (People areas of the future — Program, Registration, Participants, Updates, Insights, Settings) are *not* rendered until their engines exist. Absence of capability is expressed by absence of surface, never a disabled grey wall.

## 4. Home — four questions, no dashboard

Home answers exactly four questions, as an editorial column, in priority order:

1. **Continue creating** — the active event: its title, this-moment focus, readiness as one number, one link in. This is the hero.
2. **Needs attention** — the active event's required actions, as sentences with their next step. Never counters, never badges.
3. **Upcoming** — other future events by date, each with its phase word and days-away sentence. Derived cheaply from the event list; no per-event health computation on Home.
4. **Recently** — team activity. There is no activity source yet (the Audit engine is a future milestone). Home does not fabricate one. Until it exists, Recently is an honest, teaching line, not "No data."

Cost is bounded exactly as Studio Core's Home was: one readiness review for the active event, one event list. Home never grows into charts or widget grids.

## 5. Command palette & search — foundation only

0.8 builds the architecture, not the widget (Objective 5 is explicit: integration points, not implementation).

- **Action registry** (`constants/commands.ts`, typed in `types/command.ts`). Every meaningful Studio action is a `StudioCommand`: a stable id, a bilingual title, match keywords, a scope, and a destination (an href today; an action seam later). This is the single list a future palette renders and the single list search draws navigational results from. New surfaces register their action here — that registration is the integration point.
- **One search language** (`services/studio-search.ts`, typed in `types/command.ts`). `searchStudio(query)` returns one ranked, typed result stream across Events, People, Venue and Media — the same grammar for every kind, so organizers never learn per-area search. It composes the existing application services only; it owns no storage vocabulary. Ranking is language-agnostic today, so the concrete function takes only a query; the `StudioSearchGateway` contract keeps `locale` for when localized content ranking lands. It is callable and tested now; it renders no UI in 0.8.
- **Matching is pure** (`utils/command-match.ts`): token matching and ranking are a pure function shared by the registry and search, unit-tested without infrastructure.

**Accessibility primitive decision (resolves Open-Questions #11): React Aria.** When the palette combobox and other composed widgets are built, they use React Aria's behavior hooks — unstyled, WCAG-grade, with no visual opinions to fight the design system. 0.8 ships no such widget, so the dependency is *decided but not yet installed*: adding a package with nothing to consume it would violate the zero-dead-code rule. The foundation is built React-Aria-ready; the import lands with the first combobox.

## 6. Adaptive Studio — one product, three intents

Not one layout shrunk. Each device is designed for what the organizer does on it:

- **Desktop — creation.** The full workspace: side journey plus surface, the composer's three columns, room to shape.
- **Tablet — editing.** The same workspace, journey collapsed to a wrapping row above the surface; forms and content editing at comfortable width; the composer remains usable for content, not layout gymnastics.
- **Mobile — management.** Reading and deciding: readiness, required actions, approvals, launch. The journey is a horizontal row; every target is ≥44px; approving a launch from a phone is a first-class path. Creation-heavy surfaces guide toward a larger screen rather than faking a tiny canvas.

Device intent is expressed structurally (layout and disclosure), never by hiding information the smaller intent still needs to decide with.

## 7. Empty states are first-class

No surface ever says "No data." Every empty state answers "what should I do next?" by doing one of three things: **teach** (what this place is for), **encourage** (the first step, as an action), or **continue** (point back into the workflow). Empty-state copy is a bilingual constant per surface (`constants/empty-states.ts`), rendered by one quiet presentational component — typography and whitespace, no icons.

## 8. Notifications — a philosophy, not a center

0.8 builds no notification center and no bell. The doctrine: **surface only information that changes a decision.** A required action, a returned review, a launch that failed a gate — these already live where the decision is made (Home "needs attention," the workspace Overview, the Launch surface). Everything else is silence. Silence is part of the product; an organizer should end the day less tired. When a true push channel is needed (registration confirmations, day-of updates), it belongs to the Notification engine (S3), addressed to attendees — not a Studio inbox for organizers.

## 9. Studio language

Every visible word is product language and passes three tests: it is not technical vocabulary (no "collection," "record," "field," "slug," "CMS," "admin"); it sounds like Hason (calm, plain, human); and inside Hebrew it is Hebrew (no stray English labels). The workspace "Composer" stop is renamed to **Experience** (`he: החוויה`) to match the approved IA, where the area *is* the Experience and the composer is how one edits it. All copy remains `Record<Locale, string>` constants — no third rendering path.

## 10. What stays frozen

The composition root, every repository interface, every application-service contract, the access layer (`overrideAccess: false`), the lifecycle/readiness/health engines, and the DTO boundary are untouched. 0.8 adds presentation, navigation structure, two new read-only foundation services (search), and copy. Any change beyond that is out of scope for this release.
