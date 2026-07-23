# Hason Platform — CMS Blueprint & Content Architecture

Sprint 0 — Task 0.1.7. Final architectural review before implementation. No code was changed in this task. Builds on docs/Domain-Blueprint.md.

## 1. CMS Vision

The CMS is a core product, not an admin panel. Its user is a non-technical event manager who must be able to create, brand, localize, and publish a complete event experience without a developer. The measure of success: after handoff, content never requires a code change.

Guiding rule: **the CMS manages content; the application manages business logic.** A registration scene is configured in the CMS (texts, placement, visibility); registration rules (capacity, waitlist, validation) live in the application. This boundary is never crossed in either direction.

## 2. CMS Hierarchy

The hierarchy proposed in the task brief was validated and refined. Two changes are recommended (both challenged assumptions — see §13 for approval):

```
Organization
  ├── Settings, Branding, Languages (org defaults)
  ├── Media Library (org-scoped, shared across events)
  ├── Libraries: Speakers, Sponsors, Venues, Scenes, Templates
  └── Event
        ├── Settings, SEO defaults, enabled Languages, Theme
        └── Experience
              └── Pages (ordered; at minimum the main journey page)
                    └── Scenes (ordered, typed)
                          └── Components (composition within a scene)
                                └── Content Blocks (reusable structured data)
```

Refinements versus the brief:

1. **Media, Languages, SEO, and Settings are not levels in the content chain** — they are cross-cutting facilities scoped to the right level: Media and Languages at Organization (with per-event enablement), SEO at Event (defaults) and Page (overrides), Settings at both. Placing them "below Content Blocks" in a linear chain would force editors through unrelated layers.
2. **Editors see three levels, not seven.** The full chain exists architecturally, but the editing surface exposes Event → Pages → Scenes. Components and Content Blocks are edited inside the scene panel, never as separate navigation levels. A seven-level tree would make the CMS unusable after a handful of events.

## 3. Content Architecture

Content is split into two kinds. This is the central design decision of the blueprint:

- **Content Blocks — structured data.** Speaker, Session, Sponsor, FAQ item, Statistic, Quote, Download/Document, Venue info, Timeline milestone. Blocks are created once at the appropriate scope (usually Organization or Event) and referenced everywhere. Editing a speaker's photo updates every scene that shows them.
- **Scenes — presentation.** Hero, Story, Statistics, Agenda, Speakers Grid, Sponsors Grid, Gallery, FAQ, Registration CTA, Timeline, Venue & Map, Downloads, Video, Countdown. A scene references blocks and adds presentation configuration (layout variant, background, motion intensity, visibility).

Duplication is avoided structurally: the agenda scene renders the Sessions projection; the speakers scene references Speaker blocks; nothing is retyped per page. Deleting a referenced block is prevented by usage tracking (§7).

## 4. Page Architecture

**Question posed: should Pages contain Scenes, Content Blocks, or both?**

**Recommendation: Scenes only.** Reasons:

1. One composition model means one rendering pipeline, one preview, one publishing flow, and one thing for editors to learn. Two builders (scene builder and block builder) on the same page would compete and drift apart.
2. Raw blocks on a page have no presentation contract — someone must decide layout, spacing, responsiveness. That someone becomes a developer, violating the vision.
3. Simple content pages are not a counterexample: a generic **Content scene** (rich text + media, localized) covers "plain page" needs inside the same model.

A Page is therefore: slug, localized title, SEO overrides, visibility (draft/published, optional scheduling), and an ordered list of Scenes. The main experience journey is itself a Page — the first one — so the same builder creates both the immersive scroll journey and auxiliary pages (FAQ, accessibility statement, terms).

## 5. Component Architecture

Components are the internal vocabulary of scenes: Hero, Card, Card Grid, Timeline, Gallery, CTA, Statistics Row, Accordion, Speaker Grid, Sponsor Grid, Agenda List, Registration Form Frame, Countdown, Map, Video, Image, Quote, Document List.

Architectural rules:

1. Every component maps to exactly one frontend implementation registered in the scene/component registry. The CMS stores configuration; the registry resolves rendering. This is the existing Experience Engine contract extended one level down.
2. Components are configured, never styled, by editors. Variants (layout A/B, density, alignment) are predefined; free-form styling is not offered. This keeps hundreds of events visually coherent and accessible.
3. Components consume Content Blocks by reference plus local presentation settings. A Speaker Grid = reference to Speaker blocks + variant + ordering rule.
4. New component types are code (a registry entry with a typed schema); new component instances are content. The library grows by development once, then is reused forever.

## 6. Experience Builder Flow

The proposed workflow is validated with one addition (theme inheritance):

```
Create Event (name, slug, dates, languages, default locale)
  → Select Experience Template (or start blank)
  → Select Theme (inherits organization branding; event-level overrides)
  → Create Pages (main journey page created automatically)
  → Arrange Scenes (add from scene library, drag to reorder, toggle visibility)
  → Configure Components (per-scene panel: content references + variant)
  → Localize (per-locale completion indicators, §8)
  → Preview (per locale, per device width)
  → Publish (workflow per §10)
```

Selecting a template copies the template's page/scene structure into the event as an editable instance — it never links live to the template, so later template changes cannot silently alter published events (see §11).

## 7. Media Architecture

One Media Library per Organization, shared by all its events.

- **Asset kinds**: images, videos, documents, audio, 3D assets, icons, logos, backgrounds — one collection, typed by kind, with kind-specific metadata (dimensions, duration, page count).
- **Metadata**: localized alt text (mandatory for images — accessibility gate), localized caption/credit, tags, folder/collection organization.
- **Renditions**: responsive image sizes and formats (AVIF/WebP) are generated by the platform, never uploaded manually.
- **Versioning**: replacing an asset creates a new version; references keep working; rollback restores a prior version.
- **Usage tracking**: every reference (scene, block, page, settings) is queryable — "where is this used?" before delete, with deletion blocked while references exist.
- **SEO**: file naming, alt text, and structured data derive from metadata; no separate SEO entry per asset.
- **Localization where required**: an asset can carry per-locale overrides (e.g., a hero image containing Hebrew text can have an English variant attached to the same asset — one item, locale variants, never duplicate assets).

## 8. Localization Strategy

Validated against the Domain Blueprint; unchanged in principle, extended for editorial workflow:

1. Field-level localization on every content entity — translations attach to the same document. No entity duplication, ever.
2. Locale registry at platform level; each event enables a subset and sets its default (approved, Sprint 0).
3. RTL/LTR derive from locale in one place; scenes and components are direction-agnostic by contract (logical properties).
4. **Editorial additions**: per-document, per-locale completion status (translated / missing / outdated — outdated is flagged when the source locale changes after translation); a translation dashboard per event ("12 items missing English"); publishing warns on incomplete enabled locales but does not block (fallback renders the default locale).
5. Adding a future language: add locale to registry, enable per event, translate content. No code, no schema change.

## 9. Permissions

The proposed role hierarchy is validated. Scope is the key concept: roles are grants at a scope (platform / organization / event), which is what keeps organizations isolated.

| Role | Scope | Responsibilities |
|---|---|---|
| Super Admin | Platform | Platform operation, locale registry, organization provisioning, no routine content work |
| Platform Admin | Platform | Support and oversight across organizations; cannot alter platform configuration |
| Organization Admin | Organization | Members and roles within the org, branding, org libraries, all events |
| Event Manager | Event(s) | Full control of assigned events: experience, pages, scenes, publishing, event settings |
| Content Editor | Event(s) | Create and edit content and translations; cannot publish, cannot change structure or settings |
| Registration Manager | Event(s) | Participants, registrations, waitlists, attendance; no content access |
| Viewer | Org or Event | Read-only, including drafts and reports; no edits |

Rules: permissions remain code-defined; the database stores role grants (user, role, scope). Every grant below Platform is organization-bound — cross-organization access is structurally impossible rather than filtered. The existing two-role skeleton (admin, editor) extends to this matrix in implementation; nothing is replaced.

## 10. Versioning & Publishing Workflow

```
Draft → Review → Approved → Published → Archived
```

- Every save creates a version; full history with author, timestamp, and diff; rollback restores any version as a new draft (history is never rewritten).
- Draft content is visible only to authenticated CMS users via preview.
- Review/Approved: Content Editors submit for review; Event Managers (or Org Admins) approve and publish. Approval rights are permission-gated, not convention.
- Published is the only state served publicly; Archived removes content from delivery while preserving history.
- **Recommendation (challenged assumption)**: the Review/Approved stage should be **configurable per organization** (on by default). Small teams where the editor is the approver will otherwise rubber-stamp their own work, adding friction without control. Requires approval — see §13.
- Technical note: Payload provides drafts and version history natively; Review/Approved is a thin workflow-state extension on top — designed here, implemented in a later sprint.

## 11. Future Scalability

All requested future features are supported by two existing mechanisms — scoped libraries and copy-on-use templates:

- **Speaker / Sponsor / Venue / Scene libraries**: already org-scoped collections (Domain Blueprint §7.3); "library" is a CMS view, not new architecture.
- **Experience / Event Templates**: a template is a saved structure (pages, scenes, configuration, optionally theme) stored at organization scope. Instantiation copies; it never links. This makes templates safe (no action-at-a-distance on published events) at the cost of not propagating template improvements automatically — an explicit, documented trade-off.
- **Theme Library**: themes are token sets (CSS variable values) stored at org scope, selectable per event — the runtime theming mechanism from Task 0.1 unchanged.
- **Component Library**: grows in code via the registry; exposed to editors automatically.
- **Organization Library / cross-organization sharing**: platform-scoped shared libraries (e.g., government-wide templates) are architecturally possible via a platform scope, but conflict with strict isolation as a default. Explicitly out of scope until approved (§13).

CMS cleanliness after hundreds of events: org scoping, per-event archiving, library reuse instead of copies of content (only structure is copied by templates), and usage-tracked media prevent accumulation of orphans.

## 12. Risks

1. **Editor-facing complexity** — the deepest risk. Mitigated by the three-level editing surface (§2) and configured-not-styled components (§5). Must be validated with a real event manager during the first CMS sprint.
2. **Scene/component sprawl** — dozens of near-duplicate types degrade the library. Mitigation: variants within a type are preferred over new types; adding a type requires an architecture review.
3. **Content/logic boundary erosion** — the registration scene will attract pressure to hold business rules. The §1 rule is a review gate, enforced every sprint.
4. **Translation staleness** — solved structurally by outdated-flagging (§8), but only if source-locale tracking is implemented from the start.
5. **Template drift** — copy-on-use means old events keep old structures. Acceptable and intended, but must be communicated in the CMS UI ("this event was created from template X, version Y").
6. **Workflow friction** — a mandatory review stage in one-person teams produces fake approvals. Mitigated by per-organization configurability if approved.

## 13. Recommendations Requiring Approval

Challenged assumptions and improvements over the brief — none adopted yet:

1. **Pages contain Scenes only** (not Content Blocks, not both); plain pages use a generic Content scene (§4).
2. **Cross-cutting facilities are not hierarchy levels**: Media/Languages/SEO/Settings scoped to Organization/Event/Page instead of a linear chain below Content Blocks (§2).
3. **Three-level editing surface** — components and blocks are edited within the scene panel, not navigated as tree levels (§2).
4. **Review/Approved stage configurable per organization**, on by default (§10).
5. **Templates are copy-on-use, never live-linked** (§6, §11).
6. **Cross-organization shared libraries out of scope** until explicitly approved — isolation takes precedence (§11).

## Final Review

**Can a non-technical event manager create an entirely new event without developer involvement?**

**YES**, provided the approved scene/component library covers the event's needs: create event → template → theme → pages → scenes → localize → publish involves no code at any step. Developer involvement is required only to add a *new scene or component type* to the platform library — which is platform development, not event content. This boundary is by design: it is what keeps hundreds of events coherent, accessible, and performant.

No blocking findings. The CMS architecture is ready for implementation pending approval of §13.
