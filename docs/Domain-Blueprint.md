# Hason Platform — Domain Blueprint

Sprint 0 — Task 0.1.5. Architectural checkpoint before implementation. No code was changed in this task; the existing CMS skeleton will be aligned to this blueprint in Task 0.2 after approval.

## 1. Platform Hierarchy

The platform is Organization-based. Organization is the tenancy root; every domain entity is reachable from exactly one Organization.

Content hierarchy (what is presented):

```
Organization
  └── Event
        ├── Experience
        │     └── Scenes (ordered, dynamic, CMS-driven)
        ├── EventDay
        │     └── Agenda (projection)
        │           └── Sessions
        └── Content: Speakers, Sponsors, FAQ, Pages, Media
```

Physical hierarchy (where it happens):

```
Organization
  └── Event
        └── Venue
              └── Buildings (optional)
                    └── Rooms
```

The two hierarchies meet at the Session: a Session is scheduled on an EventDay (time), placed in a Room (space), and optionally classified by a Track (theme). Rooms never own sessions; they host them. This keeps scheduling and physical layout independently editable.

## 2. Entity Relationship Overview

### Tenancy & Identity

| Entity | Belongs to | Key relationships |
|---|---|---|
| Organization | — (root) | has many Events, Users, Media, Participants |
| User | Organization (except platform admins) | has Roles; operates the CMS |
| Role | — (defined in code) | maps to Permissions |
| Permission | — (defined in code) | consumed by access control |
| Participant | Organization | has many Registrations; NOT a CMS User |

Users (staff: admins, editors) and Participants (attendees) are deliberately separate entities. They have different lifecycles, different data protection profiles, and different authentication needs. Merging them is the most common long-term modeling mistake in event platforms.

Roles and Permissions remain code-defined constants (one source of truth, reviewable, type-safe); the database stores only role assignments on Users. Custom per-organization roles would be a future extension — the permission factory architecture already supports it.

### Event Core

| Entity | Belongs to | Key relationships |
|---|---|---|
| Event | Organization (exactly one) | has one Experience, many EventDays, one Venue |
| EventDay | Event | has many Sessions (via agenda projection) |
| Venue | Event | has many Buildings (optional) and Rooms |
| Building | Venue | has many Rooms |
| Room | Venue (directly, or via Building) | hosts Sessions; Building link is optional |
| Track | Event | classifies Sessions |
| Session | EventDay | placed in Room (optional), classified by Track (optional), has Speakers |
| Workshop | — | modeled as a Session variant (see §7, pending approval) |
| Speaker | Organization (reusable across its Events) | linked to Sessions and to Scenes |

Agenda is a projection, not a stored entity: the agenda of a day is its Sessions ordered by time, optionally grouped by Track or Room. Storing agenda separately would create a second source of truth that can contradict the sessions. See §7.

### Registration Domain

| Entity | Belongs to | Key relationships |
|---|---|---|
| Registration | Participant + Event | status lifecycle (pending → confirmed → cancelled / attended) |
| Waitlist | capacity-limited target (Event or Session) | ordered queue of Participants |
| Notification | Organization | addressed to Participants/Users; triggered by domain events |

Capacity is a property of the capacity-limited target (an Event or a workshop-type Session). Waitlist entries reference the same target polymorphically, so adding a new capacity-limited entity later requires no waitlist redesign.

### Content & Presentation

| Entity | Belongs to | Key relationships |
|---|---|---|
| Experience | Event (one per event) | ordered list of Scenes |
| Scene | Organization (reusable) | type resolved by registry; content localized |
| Page | Event or Organization | generic CMS content |
| FAQ | Event | localized Q&A entries |
| Sponsor | Organization (reusable across its Events) | linked per Event with tier/order |
| Media | Organization | referenced by all content entities |
| CMS Content | — | not an entity: the sum of localized fields across entities |
| Language | — (platform registry) | enabled subset per Event; default per Event |

### Governance

| Entity | Belongs to | Purpose |
|---|---|---|
| Audit Log | Organization | who changed what, when (admin/security actions); append-only |
| Event Log | Organization | domain occurrences (registration created, notification sent); append-only |

Audit Log answers accountability questions; Event Log answers operational ones. They have different retention, different consumers, and must not be merged.

## 3. Domain Boundaries

Five bounded contexts. Entities never reach across a boundary except through public contracts:

1. **Identity & Access** — Organization, User, Role, Permission. Owns authentication and the tenancy boundary.
2. **Event Management** — Event, EventDay, Venue, Building, Room, Track, Session, Speaker. Owns structure and scheduling.
3. **Registration** — Participant, Registration, Waitlist. Owns capacity and attendance. Reads from Event Management; never writes to it.
4. **Presentation (Experience Engine)** — Experience, Scene, Renderer, Page, FAQ, Sponsor, Media. Owns how content is displayed. Contains zero business rules: a Scene that shows the agenda reads a projection provided by Event Management; a registration Scene submits to the Registration context. Scenes are pure presentation contracts (data in, markup out).
5. **Communication & Governance** — Notification, Audit Log, Event Log. Reacts to domain events from other contexts; never initiates domain changes.

The Experience Engine's independence is preserved: the engine knows scene type ids and content payloads, nothing else. Business logic lives in the owning context and is exposed to scenes as data.

## 4. Business Modules

Mapping of bounded contexts to future feature modules (src/features/):

| Module | Context | Contains |
|---|---|---|
| organizations | Identity & Access | org management, member management |
| events | Event Management | event lifecycle, days, venue, rooms, tracks |
| sessions | Event Management | session scheduling, speakers assignment |
| registration | Registration | participant flows, capacity, waitlist |
| notifications | Communication | templates, delivery, preferences |
| experience | Presentation | scene components, renderer (engine core stays in src/experience-engine/) |
| content | Presentation | pages, FAQ, sponsors, media management |

Each module follows the mandatory feature template and exposes only its index.ts.

## 5. Future Scalability

- **Multiple organizations**: Organization is the root of every relationship. Adding organizations is a data operation. Isolation is a domain rule now (every query is organization-scoped by design) and becomes an enforced access-control rule at implementation — no schema change needed for full multi-tenancy later.
- **Unlimited events**: Events are rows, not deployments. Nothing in the model is per-event code.
- **Future languages**: translation attaches to content fields (Payload document-level localization). A new language is a locale registry entry plus content entry. Zero entity duplication, zero architectural change.
- **600 concurrent users**: read-heavy public traffic hits published, cacheable projections (experience, agenda); write traffic (registrations) is isolated in one context, enabling targeted optimization (queues, idempotency) without touching the rest.
- **Future channels**: because scenes consume typed data contracts, a future mobile app or kiosk can consume the same contracts without CMS changes.

## 6. Architectural Risks

1. **Tenancy leakage** — the highest risk. A single missed organization filter exposes one organization's data to another. Mitigation: organization scoping must live in one shared access layer (extension of the existing permission factories), never in per-collection ad-hoc filters. Must be verified with dedicated tests from the first implementation sprint.
2. **Agenda drift** — if agenda is ever stored as its own editable structure, it will contradict session data. Mitigation: agenda stays a projection (§7, pending approval).
3. **Scene contracts eroding** — pressure will come to put "just one" business rule (e.g., registration validation) inside a scene. Mitigation: constitution rule + review gate; scenes receive data and callbacks, never policies.
4. **Participant data protection** — participants are personal data of government-adjacent organizations. Retention, export, and deletion must be designed into the Registration context before it is implemented, not after.
5. **Polymorphic waitlist complexity** — waitlist targeting Event-or-Session is flexible but harder to constrain relationally in PostgreSQL. Acceptable; must be encapsulated in the Registration context only.
6. **Venue optionality** — fully virtual events have no venue. Venue must remain optional on Event, and Session's Room link must be optional, or virtual events break the model.

## 7. Recommended Improvements (require approval)

1. **Workshop as a Session variant, not a separate entity.** A workshop is a session with capacity and registration. A separate Workshop entity would duplicate scheduling, room placement, speaker linkage, and localization. Recommendation: `Session.sessionType` (talk | workshop | break | ...) where capacity/registration fields apply to registrable types. The type list itself is CMS-configurable content, not code.
2. **Agenda as projection.** No Agenda table/collection. The agenda is Sessions grouped by EventDay and ordered by time. The CMS edits sessions; the frontend renders the projection.
3. **Speakers, Sponsors, Scenes owned by Organization, linked per Event.** Organizations run recurring events with the same speakers and sponsors. Event-level linkage (with per-event ordering/tier) avoids re-entering people and logos every year.
4. **Room belongs to Venue with optional Building.** Buildings are optional per the approved hierarchy; forcing every room through a building would break small venues.

## Final Review

| Requirement | Status |
|---|---|
| Multiple Organizations | YES — Organization is the tenancy root of every entity |
| Unlimited Events | YES — events are data; no per-event code or deployment |
| Dynamic Experience Engine | YES — registry-based, scenes are presentation contracts with zero business rules |
| CMS Independence | YES — the engine consumes typed contracts; the CMS owns content; neither knows the other's internals |
| Future Languages | YES — field-level localization; new language = locale entry + content |
| 600 Concurrent Users | YES — cacheable public projections; writes isolated in the Registration context |
| Future Scalability | YES — bounded contexts allow independent evolution; multi-tenancy is a rule flip, not a redesign |

No blocking findings. The domain model supports all requirements.

## Impact on Existing Skeleton (deferred to Task 0.2)

The Task 0.1 CMS skeleton predates the Organization decision. Task 0.2 must: add an Organizations collection; add an `organization` relationship to Events, Media, Speakers, Sponsors, Scenes; and add the organization-scoping access-control layer. No approved code is replaced — only extended.
