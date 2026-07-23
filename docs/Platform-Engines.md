# Hason Platform — Platform Engines Architecture

Milestone 1 — Task 1.2. Final platform architecture checkpoint before feature development. No code was changed in this task. Builds on all approved blueprints; extends the bounded contexts of Domain-Blueprint.md §3 into an engine catalog.

## 1. Platform Overview

Everything in Hason belongs to exactly one Engine. An Engine is the owner of a set of domain objects and the only place their rules live. Features never talk to each other; they talk to engines through service contracts. The Experience Engine built in Sprint 0 is the pattern for all others: a typed public contract (`index.ts`), internals nobody else may import, zero knowledge of its consumers.

```
Frontend (pages, layouts)
  → Feature (components, hooks)
    → Application Service (feature's services/, orchestrates use cases)
      → Engine (domain rules, service contract)
        → Repository (Payload Local API wrapper)
          → Payload → PostgreSQL
```

Two communication modes, and only two:

1. **Synchronous** — a consumer calls an engine's public service contract. Contracts are typed interfaces exported from the engine's `index.ts`; internals are import-forbidden (Component-Architecture §1 dependency rule).
2. **Asynchronous** — an engine emits domain events (`registration.confirmed`, `content.published`); reactive engines (Audit, Notification, future Search/Analytics) subscribe. Emitters never know their subscribers. This is the only mechanism that keeps Audit and Notification from coupling to every other engine.

Engine-to-engine synchronous calls are allowed only downward along a declared dependency (see catalog); circular dependencies are forbidden and reviewed per sprint.

## 2. Engine Catalog

The recommended 16-engine list was not blindly accepted. Four changes, justified inline, summarized in §8 for approval. Result: 12 active engines + 3 deferred.

### 2.1 Identity Engine *(merges Authentication + Authorization — change 1)*

- **Purpose**: who you are and what you may do.
- **Responsibilities**: authentication (sessions, credentials, future SSO), RBAC (roles, permissions, scoped grants per CMS-Blueprint §9), access-control factories.
- **Public API**: authenticate, current user, `hasPermission(user, permission, scope)`, access factories for collections.
- **Dependencies**: none (root engine).
- **Forbidden**: knowing what content *is*; org business rules; storing participant profiles.
- **Future**: government identity providers (SAML/OIDC) as authentication strategies — contract unchanged.
- **Lifecycle**: first engine loaded; every request passes through it.
- **Boundaries**: everyone may call it; it calls no one. Justification for the merge: authentication and authorization share the user model, the session, and the scope concept; as two engines every request would cross an engine boundary twice for one question. They remain separate modules internally.

### 2.2 Organization Engine

- **Purpose**: tenancy.
- **Responsibilities**: organizations, membership, org-scoped grants, branding ownership, organization isolation rule (every query org-scoped).
- **Public API**: get organization, members, `scopeToOrganization(query)` — the single implementation of isolation used by every repository.
- **Dependencies**: Identity.
- **Forbidden**: owning events (change 2 — see below), event content, registration data.
- **Future**: cross-org shared libraries (pending approval), white-label.
- **Lifecycle**: resolved per request (org context) after Identity.
- **Boundaries**: called by all engines that need scoping; calls Identity only.

**Change 2 — Event ownership.** The brief assigns Event → Organization Engine. Rejected, with reasoning: Organization Engine would then own event structure, days, venues, rooms, tracks, sessions — it becomes the monolith the engine model exists to prevent. Per Domain-Blueprint §3, Event Management is its own bounded context. Recommendation: a dedicated **Event Engine**; Organization Engine owns tenancy only.

### 2.3 Event Engine *(added — change 2)*

- **Purpose**: the structure of events.
- **Responsibilities**: Event lifecycle, EventDay, Venue, Building, Room, Track, Session (incl. workshop-type sessions), agenda projection.
- **Public API**: event by slug, days/sessions projections, capacity queries.
- **Dependencies**: Organization (scoping), Identity (permissions).
- **Forbidden**: registration rules, presentation, notification decisions.
- **Future**: recurring events, event templates instantiation, future event types (new session types are data).
- **Lifecycle**: per-request reads; heavy caching of published projections.
- **Boundaries**: Experience and Registration engines read from it; it reads no one above it.

### 2.4 Experience Engine *(exists — approved Sprint 0)*

- **Purpose**: how an event is experienced.
- **Responsibilities**: Experience, Scene, scene registry, renderer contract, pages composition (CMS-Blueprint §4).
- **Public API**: existing `src/experience-engine/index.ts` contract (registry, types) — unchanged, extended only.
- **Dependencies**: Event (projections), Content (blocks), Theme (tokens), Localization.
- **Forbidden**: any business rule (constitution); capacity, registration, permissions logic.
- **Future**: new scene types (registry entries), new channels (mobile consumes same contracts).
- **Lifecycle**: render-time; must work from cached published data only.
- **Boundaries**: consumes read contracts; never writes.

### 2.5 Content Engine

- **Purpose**: reusable content.
- **Responsibilities**: Speaker, Sponsor, FAQ, Page, Content Blocks, publishing workflow states (draft/review/published/archived), version history policy.
- **Public API**: blocks by reference, published-content queries, workflow transitions.
- **Dependencies**: Organization, Identity, Media, Localization.
- **Forbidden**: how content is rendered (Experience), where files live (Media).
- **Ownership note**: Speaker sits here, not in Event Engine — reconciling Domain-Blueprint (Event Core table) with CMS-Blueprint (Content Block). A speaker is org-owned reusable content; the Session→Speaker link belongs to Event Engine, the Speaker document belongs here. This matches the brief.
- **Future**: content templates, AI-assisted translation hooks.
- **Lifecycle**: editorial-time writes, render-time reads.

### 2.6 Media Engine

- **Purpose**: binary assets.
- **Responsibilities**: org-scoped library, kinds, renditions, localized alt/captions, versioning, usage tracking, delete protection (CMS-Blueprint §7).
- **Public API**: asset by id, rendition URLs, usage report.
- **Dependencies**: Organization, Identity.
- **Forbidden**: knowing what an asset means (that is content's concern).
- **Future**: S3-compatible storage adapters (pending deployment decision), CDN integration, 3D assets.
- **Lifecycle**: upload-time processing, render-time delivery.

### 2.7 Localization Engine

- **Purpose**: languages and direction.
- **Responsibilities**: locale registry, per-event enabled locales and default, direction mapping, UI message catalogs, translation status (translated/missing/outdated per CMS-Blueprint §8).
- **Public API**: locales for event, direction for locale, translation status report.
- **Dependencies**: none domain-wise (Settings for registry storage).
- **Forbidden**: storing content translations (they live on content documents — field-level localization).
- **Future**: new languages as data; machine-translation integration.
- **Lifecycle**: request-time locale resolution (middleware already implements the routing edge of this engine).

### 2.8 Theme Engine

- **Purpose**: visual identity as data.
- **Responsibilities**: token sets (Tier-2 overrides per Component-Architecture §5), org branding, event themes, contrast validation as publish gate.
- **Public API**: resolved token set for (organization, event), validate theme.
- **Dependencies**: Organization, Content (publish gate hook).
- **Forbidden**: component styling logic; layout.
- **Future**: theme library, white-label, dark mode variants.
- **Lifecycle**: resolved at render; cacheable per event.

### 2.9 Registration Engine

- **Purpose**: participation.
- **Responsibilities**: Participant, Registration lifecycle, Waitlist, capacity enforcement, attendance; participant data protection (retention/export/deletion — Domain-Blueprint risk 4).
- **Public API**: register, cancel, waitlist position, capacity status, participant schedule.
- **Dependencies**: Event (capacity targets), Organization, Identity; emits domain events.
- **Forbidden**: sending notifications (emits events instead); rendering anything.
- **Future**: external registration systems (pending open question), payments, check-in devices.
- **Lifecycle**: transactional writes; the platform's only high-write path (600-user target planning centers here).

### 2.10 Notification Engine

- **Purpose**: telling people things.
- **Responsibilities**: templates (localized), channels (email first), delivery, preferences.
- **Public API**: none for sending — it *subscribes* to domain events; API only for template/preference management.
- **Dependencies**: Localization, Organization; subscribes to Registration/Content events.
- **Forbidden**: deciding *when* something notification-worthy happened (emitters decide by emitting).
- **Future**: SMS, push, in-app feed (Participant portal ActivityFeed consumes it).
- **Lifecycle**: async worker; failure never blocks the emitting transaction.

### 2.11 Audit Engine

- **Purpose**: accountability and traceability.
- **Responsibilities**: Audit Log (admin/security actions), Event Log (domain occurrences), retention policies; append-only guarantee.
- **Public API**: query logs (permission-gated); write API is event subscription only.
- **Dependencies**: subscribes to everything; calls no one.
- **Forbidden**: interpreting or acting on logs.
- **Future**: export for government compliance, anomaly reports (feeds Analytics later).
- **Lifecycle**: async append; never blocks emitters.

### 2.12 Settings Engine

- **Purpose**: runtime configuration as content.
- **Responsibilities**: platform settings, org settings, event settings (each a scoped, CMS-managed document); SEO defaults.
- **Public API**: resolved settings for scope chain (platform → org → event).
- **Dependencies**: Organization, Identity.
- **Forbidden**: build-time configuration (that is `config/env.ts` — foundation, not an engine); feature flags (deferred engine).
- **Lifecycle**: read-mostly, heavily cached.

### Deferred engines *(change 3 — defined now, built when first needed)*

- **Analytics Engine** — consumes the Event Log; owns metrics, dashboards data. Deferring avoids building reporting before there is data.
- **Search Engine** — consumes domain events to build indexes; owns query API. Until then, engine-level filtered queries suffice.
- **Feature Flag Engine** — owns flags and rollout rules. Until needed, absence of a flag system means features ship whole — acceptable pre-launch.

Deferral is safe because both integrate through the existing async event mechanism — no engine will need rework when they arrive.

### Removed: "Core Engine" *(change 4)*

A Core Engine is an ownerless grab-bag by definition — it violates "every domain object belongs to exactly one Engine" because it owns none. What the brief likely intends by Core (tokens, config, shared utils, primitives, event bus) is the **Foundation** (Component-Architecture §1): shared libraries with no domain state. Libraries are not engines. Recommendation: no Core Engine; the event-bus mechanism itself lives in Foundation as infrastructure.

## 3. Ownership Matrix

Every domain object, exactly one owner:

| Domain object | Engine |
|---|---|
| Organization, Membership | Organization |
| User, Role, Permission, Session (auth) | Identity |
| Event, EventDay, Venue, Building, Room, Track, Session, Agenda (projection) | Event |
| Experience, Scene, Page composition | Experience |
| Speaker, Sponsor, FAQ, Page content, Content Block, workflow state | Content |
| Media asset, rendition, usage record | Media |
| Locale registry, direction, UI messages, translation status | Localization |
| Theme, token set, branding | Theme |
| Participant, Registration, Waitlist, attendance | Registration |
| Notification, template, preference | Notification |
| Audit Log, Event Log | Audit |
| Platform/Org/Event settings, SEO defaults | Settings |

Deviations from the brief's examples: Event → Event Engine (not Organization Engine, §2.2 justification). Speaker → Content Engine (as the brief proposes; reconciliation documented in §2.5).

## 4. Cross-Cutting Concerns

| Concern | Where it lives | Why |
|---|---|---|
| Logging | Foundation (infrastructure); Audit Engine owns *persistent domain/audit* logs | technical logging is not domain state |
| Caching | per-engine policy, Foundation mechanism | each engine knows its invalidation rules; no global cache god-object |
| Localization | Localization Engine + field-level localization on content documents | split approved in CMS-Blueprint §8 |
| Permissions | Identity Engine; *enforced* in every engine's service layer | one definition, enforcement at each boundary |
| Media | Media Engine only | usage tracking requires one owner |
| Search | deferred Search Engine; until then per-engine queries | avoids premature index infrastructure |
| Feature flags | deferred Feature Flag Engine | see §2 deferrals |
| Configuration | build-time: Foundation (`config/`); runtime: Settings Engine | fail-fast env vs. CMS-managed settings are different things |

## 5. Communication Flow (validated)

The brief's layered flow is validated as-is (§1 diagram) with two clarifications:

1. **Repositories are engine-internal.** A repository wraps the Payload Local API and applies `scopeToOrganization` unconditionally. No feature or other engine ever queries Payload directly — this is where tenancy isolation (Domain-Blueprint risk 1) is enforced exactly once.
2. **Reactive engines subscribe; nobody calls them to react.** Registration emits `registration.confirmed`; Notification and Audit subscribe. Removing Notification from the platform must not require touching Registration — that is the test of the boundary.

## 6. Future Extensibility (validated)

- **Mobile App / Public API**: engines' service contracts are transport-agnostic; a public API layer exposes selected contracts. No engine changes.
- **External integrations**: inbound via the API layer; outbound via event subscribers (an integration is architecturally a sibling of Notification).
- **Government identity providers**: authentication strategies inside Identity Engine (§2.1).
- **Future organizations / event types**: data, not code (§2.2, §2.3).
- **Offline mode**: Experience Engine renders from published projections, which are serializable snapshots — an offline bundle is those snapshots. Registration writes queue through its service contract. No engine redesign.
- **Import/Export**: per-engine export of owned objects through public contracts; an import/export feature orchestrates engines, owns nothing.

## 7. Architectural Risks

1. **Boundary erosion under deadline pressure** — direct Payload queries from features are faster to write than going through engines. Mitigation: repository access is structurally private to engines; review gate per sprint.
2. **Event-bus becoming implicit coupling** — subscribers that *must* run synchronously (contrast-gate on publish) are not events; they are declared hooks. The distinction (event = fire-and-forget; gate = synchronous contract) must be kept explicit per integration.
3. **Engine proliferation** — new engines require the same approval as this document; the default answer to "new engine?" is "which existing engine owns this?"
4. **Identity merge regret** — if government SSO requirements explode authentication complexity, Identity can split internally (auth strategies vs. RBAC modules) without changing its public contract; the merge is reversible at the module level.
5. **Deferred engines built ad-hoc** — pressure to add "just one metric" before Analytics exists. Mitigation: Event Log (Audit) already captures the data; reporting waits for the engine.

## 8. Recommendations Requiring Approval

1. **Merge Authentication + Authorization into one Identity Engine** (internally modular, reversible) — §2.1.
2. **Add Event Engine; Organization Engine owns tenancy only** — Event does NOT belong to Organization Engine — §2.2–2.3.
3. **Defer Analytics, Search, Feature Flag engines** — contracts reserved, integration path (event bus) already defined — §2.
4. **Remove "Core Engine"** — shared infrastructure is Foundation libraries, not an engine — §2.
5. **Speaker owned by Content Engine** (per brief), with the Session→Speaker *link* owned by Event Engine — resolves the Domain/CMS blueprint tension — §2.5.

## Final Review

**Can every future feature be assigned to exactly one Engine?**

**YES.** Test applied to the known roadmap: every feature in the Participant portal (Registration + Notification + Event reads), Organizer portal (per-engine management surfaces), Experience scenes (Experience + Content reads), and CMS flows (Content + Media + Theme + Localization) maps to exactly one owning engine, with reads from others via public contracts. Features that *orchestrate* several engines (import/export, dashboards) own no domain objects — they are application services, which is precisely what the application-service layer is for. No feature was found that requires shared ownership.

No blocking findings. Pending §8 approval, the platform architecture is locked and feature development can begin.
