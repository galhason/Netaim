# Hason Studio — Information Architecture

The brief's fifteen top-level areas were challenged. Fifteen peers create a control panel; organizers think in events, not entity types. The Studio collapses to **six top-level areas**, with the event as the central workspace.

## Top level

| Area | Purpose | Absorbs from the brief |
|---|---|---|
| **Home** | What needs me, what changed, what to continue | Home, Activity (personal slice) |
| **Events** | The list of event workspaces; entering one opens everything about it | Events, Experiences, Scenes, Venues, Registrations (per event) |
| **Library** | Organization-owned reusables | People, Media, Templates, Venues (saved), Scene library |
| **Insights** | Meaningful measurement across events | Analytics, Activity (org slice) |
| **Organization** | Identity and team | Settings (org), Languages, Brand, Members, Roles |
| **Platform** | Platform-scope operation; visible to platform roles only | Organizations, System, Settings (platform) |

Rationale: Experiences and Scenes are not places one visits — they are what one *does inside an event*. Registrations belong to their event. Venues are event facts with a Library memory. Two Activities (personal on Home, organizational in Insights) replace a standalone log viewer.

## The Event Workspace

Entering an event opens a quiet workspace with a stable side journey (not tabs-as-dashboard):

```
Overview        the event's state in prose: status, dates, readiness,
                what remains before publishing — one primary action
Experience      the Experience Composer (the heart — see User Flows)
Program         days, sessions, tracks, rooms — edited as the journey,
                mirroring the public "day" grammar
People          speakers and facilitators for this event (linked from Library)
Venue           place, access, details
Registration    settings, capacity, form, approvals, waitlist
Participants    who is coming; statuses; check-in (during event)
Updates         announcements to attendees (the attendee "Updates" source)
Settings        languages, profile (atmosphere/accent/motion), publishing
```

The workspace order mirrors the organizer's chronology: define → build → program → people → place → open → run.

## Navigation model

- **Global bar**: organization switcher (multi-org users), area navigation, search, the user.
- **Search is a first-class citizen**: one field finds events, people, media, sessions — organizers should never navigate trees to find a thing they can name.
- **Scope is always visible**: organization → event → chapter, expressed as a calm breadcrumb line, never nested menus.
- **Home is role-aware**: each role sees its own "needs me" (see User Flows).

## Home — not a dashboard

A single editorial column, at most four quiet groupings, in priority order: **Continue creating** (the experience or program you last shaped, one line, one action), **Needs attention** (approvals waiting, publishing queue, capacity thresholds — in sentences, not counters), **Upcoming** (the next events with their readiness state), **Recently** (team activity as a short human feed). No charts on Home. No counts without consequence. If nothing needs the person, Home says so and offers to continue building — calm is information.

## Scoping and permissions surface

Every area is organization-scoped by construction (matching the repository-level scoping rule in Platform-Engines). Role grants shape visibility: a Content Editor's Studio simply has no Registration area; a Registration Manager's event workspace opens on Participants. Absence of capability is expressed by absence of surface — never by disabled grey walls.

## Future areas (reserved, not built)

Marketplace (templates as products), Portals (speaker/volunteer/partner), Devices (check-in tablets, kiosk, signage) — each slots as a Library/Platform extension without reshaping the six-area top level.
