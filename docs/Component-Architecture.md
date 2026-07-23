# Hason Platform — Component Architecture & Design System Foundation

Sprint 0 — Task 0.8. Final Design System checkpoint before implementation. No code was changed in this task. Builds on docs/Architecture.md, docs/Domain-Blueprint.md, docs/CMS-Blueprint.md.

## 1. Component Hierarchy

The proposed hierarchy was validated with one refinement (challenged assumption, requires approval — §9.1): in the brief, "Foundation" and "Primitives" are both component layers, but they overlap completely — Button appears in both mental models. The refined hierarchy makes Foundation a non-component layer:

```
Foundation        design tokens, typography scale, direction system,
                  motion system, breakpoints — no components, no JSX
       ↓
Primitives        single-purpose UI atoms (Button, Input, Badge, Spinner)
                  domain-blind, style-token-bound, fully accessible
       ↓
Composed          multi-primitive assemblies (DatePicker, Table,
                  CommandPalette, FileUpload) — still domain-blind
       ↓
Feature           domain-aware components (SpeakerCard, AgendaEditor,
                  RegistrationTable) — live inside their feature module
       ↓
Layouts           page skeletons per portal (navigation, chrome, grid)
       ↓
Pages             route compositions only — zero new UI, zero logic
```

Dependency rule (enforced in review and by import boundaries): each layer imports only from layers above it. Primitives never import from features. Features never import another feature's components except via its public index. Pages import layouts and features only.

Location mapping: Foundation → `src/styles/` + `src/config/`; Primitives and Composed → `src/shared/components/`; Feature components → `src/features/<feature>/components/`; Layouts → `src/shared/layouts/`; Pages → `src/app/`.

## 2. Foundation Components (Primitives & Composed)

Domain-blind, reusable everywhere, accessible by default. Grouped by responsibility:

| Group | Primitives | Composed |
|---|---|---|
| Actions | Button, IconButton | Dropdown (menu), CommandPalette |
| Forms | Input, Textarea, Checkbox, Radio, Switch, Label, FieldError | Select, DatePicker, TimePicker, FileUpload, SearchField, Form (validation frame) |
| Feedback | Alert, Toast, Progress, Skeleton, Spinner | EmptyState, ConfirmDialog |
| Overlay | Tooltip, Popover | Dialog, Drawer |
| Navigation | Breadcrumb, Tab | Tabs, Pagination, Stepper |
| Data display | Badge, Chip, Avatar, Icon, Divider, KeyValue | Table (sortable, selectable, virtualized), Calendar, Accordion, QRCode, Card |

Rules for every entry:

1. **Variants over new components** — Button has variants (primary/secondary/ghost/destructive) and sizes; there is never a SecondaryButton.
2. **Controlled and uncontrolled modes** for all inputs.
3. **No layout opinions** — primitives size to their container; spacing belongs to the parent.
4. **Token-bound** — no literal colors, sizes, or durations; only tokens (§6).
5. **Every text is a prop** — primitives contain zero hardcoded strings; labels arrive from i18n/CMS at the feature layer.

## 3. Feature Components

Feature components compose primitives with domain data. They are defined per module (Domain Blueprint §4); the catalogs below are the initial contract — each maps to one feature module.

### Experience components (`features/experience`, powered by the scene registry)

Scene infrastructure: SceneContainer (viewport, entrance orchestration, reduced-motion aware), NavigationProgress (journey position), SceneErrorBoundary (a failed scene never breaks the journey).

Scene implementations: Hero, StorySection, Statistics, Timeline, SpeakerGrid + SpeakerCard, Agenda + SessionCard + WorkshopCard, Venue + VenueMap, Countdown, Gallery, Video, SponsorGrid, RegistrationCTA, FAQ, Downloads, Contact.

Each scene implementation is the registered renderer of a CMS scene type (CMS Blueprint §5): CMS stores configuration and content references; these components own presentation. They contain zero business rules — RegistrationCTA renders state and submits to the registration context; it decides nothing.

### Participant components (`features/participants`, portal)

DashboardCard, QRCard (entry pass), ScheduleCard, SessionStatus, WorkshopStatus, NotificationItem, ProfileHeader, ActivityFeed, ConnectionCard, DocumentCard, CertificateCard, FavoriteCard.

### Organizer components (`features/organizer`, portal)

AnalyticsCard, RegistrationTable, ParticipantTable (both compose the shared Table), SpeakerEditor, AgendaEditor, SceneEditor, MediaBrowser, RoleManager, OrganizationSwitcher, ApprovalPanel, PublishingStatus.

### CMS components (`features/cms`)

ContentEditor, RichTextEditor, MediaPicker, LanguageSwitcher, VersionHistory, SEOPanel, SceneBuilder, PageBuilder, ComponentPicker, ContentReference, DraftStatus, PublishingControls.

Note: Payload's admin framework natively provides rich text, version history, drafts, and media management, and supports custom views/components. Whether the CMS UI is built as customized Payload admin or as a fully custom application is an open architectural decision with major cost implications — §9.2.

## 4. Layout System

Eight layouts, one per surface. A layout owns chrome (navigation, header, footer), content grid, and its route group; it never owns business logic.

| Layout | Route group | Notes |
|---|---|---|
| PublicLayout | `(frontend)` | organization/platform public pages |
| EventExperienceLayout | `(frontend)/[locale]/events/[slug]` | minimal chrome; scenes own the viewport; NavigationProgress |
| ParticipantLayout | `(participant)` | authenticated portal navigation |
| OrganizerLayout | `(organizer)` | org-scoped navigation, OrganizationSwitcher |
| CMSLayout | `(payload)` or `(cms)` | pending §9.2 |
| AuthLayout | `(auth)` | centered, minimal, no navigation |
| ErrorLayout | error boundaries | works with zero data dependencies |
| PrintLayout | print routes/styles | schedules, certificates, entry passes (QR) |

All layouts are locale-prefixed and direction-agnostic. ErrorLayout must render even when providers fail — it depends on Foundation only.

## 5. Design Token Architecture

Three tiers, extending the Task 0.1 token base (values are out of scope by design):

```
Tier 1  Primitive tokens    raw scales: color ramps, size scale, duration
                            scale, radius scale, z-index scale
Tier 2  Semantic tokens     meaning-bound: surface, text-primary, brand,
                            focus-ring, elevation-raised, motion-standard
Tier 3  Component tokens    per-component knobs (button-radius,
                            card-padding) — defined only when a component
                            needs to vary independently
```

- **Categories**: color, spacing, radius, elevation/shadow, typography (family per script, size, weight, line-height), motion (duration + easing), opacity, breakpoints, z-index.
- **Theming**: a theme is a set of Tier-2 overrides (CSS variables). Organization branding and per-event themes (CMS Blueprint §11) override semantic tokens at a container boundary — components are untouched. Components never reference Tier 1 directly; this is what makes runtime theming safe.
- **Direction**: RTL/LTR is not a token set. It derives from locale (`config/locales.ts`), applies via `dir`, and components use logical properties exclusively. Direction-specific tokens are prohibited — they would fork the token system.
- **Z-index**: a fixed named scale (base, raised, sticky, overlay, toast) — ad-hoc z-index values are forbidden.
- **Motion**: duration and easing tokens only; every animated component consumes the global reduced-motion override (already in Foundation).

## 6. Responsive Strategy

- **One component, all viewports.** No Mobile/Desktop component pairs, ever. Components adapt via CSS (fluid layout, container queries) and, only where structure truly changes (Table → card list), a single component renders both structures from one data contract.
- **Container queries over viewport queries for components.** A SpeakerGrid inside a narrow scene column must adapt to its container, not the screen. Viewport breakpoints (token-defined: mobile / tablet / desktop) are reserved for layouts.
- **Landscape** is handled by the same fluid rules plus explicit low-height handling in EventExperienceLayout (scenes may not assume tall viewports).
- Touch targets meet minimum size on all pointer types; hover-only affordances are forbidden (every hover action has a focus/tap equivalent).

## 7. Accessibility Strategy

Accessibility is a property of the primitive layer — features inherit it and cannot opt out:

1. **Keyboard**: every interactive primitive is fully keyboard-operable with documented key maps (roving tabindex in composites like Tabs/Table).
2. **ARIA**: semantic HTML first; ARIA fills gaps (Dialog focus trap, live regions for Toast, combobox patterns for Select/CommandPalette).
3. **Focus**: visible focus (token-driven) always; focus restoration on overlay close; skip-to-content in all layouts (already in i18n messages).
4. **Contrast**: token pairs (surface/text) are validated at the token level, so every theme — including CMS-configured event themes — is checked before publish. Theme validation is a CMS publish gate, not a runtime hope.
5. **Reduced motion**: global mechanism (Foundation) + scene-level contract: every scene defines its reduced-motion rendering; entrance animations degrade to static.
6. **Recommendation (§9.3)**: build primitives on a headless accessibility library rather than hand-rolling focus traps, comboboxes, and roving tabindex — these are the most defect-prone patterns in frontend engineering.

## 8. Future Extensibility

- **New scene type** = one feature component + one registry entry + one CMS schema. No changes to engine, layouts, or tokens.
- **New portal** (e.g., speaker portal) = one layout + feature components from existing primitives.
- **New theme** = Tier-2 token values in the CMS. **New language** = locale entry (direction system already generic).
- **White-label** (future): platform-level branding is Tier-2 overrides at organization scope — the same mechanism as event themes, one level up.
- **Component governance**: adding a primitive or composed component requires architecture review (does a variant suffice?); the component catalog in this document is the registry of record and is updated with every addition (Constitution §17).

## 9. Recommendations Requiring Approval

1. **Refined hierarchy — Foundation is a token layer, not a component layer** (§1). Removes the Foundation/Primitives ambiguity in the brief.
2. **CMS UI strategy** — two options, decision needed before any CMS sprint:
   - **(a) Customized Payload admin (recommended):** Payload provides auth, drafts, versions, media, rich text, and localization UI out of the box; custom views (SceneBuilder, PageBuilder, SEOPanel, ApprovalPanel) are injected as custom components. Months less work; the trade-off is designing within Payload's admin framework.
   - **(b) Fully custom CMS application:** total UX freedom, at the cost of rebuilding everything Payload already provides and maintaining it for years.
3. **Headless accessibility base for primitives** (e.g., Radix UI or React Aria) wrapped in our own primitive API so the library never leaks upward and can be replaced. Alternative is hand-rolling all focus/keyboard/ARIA machinery — slower and riskier. Requires approval as a new dependency decision.
4. **Icon system** — a single icon library wrapped in the Icon primitive (one visual language, tree-shakeable) vs. a custom icon set. Recommended: library-based, wrapped, so the choice is swappable. Specific library requires approval.
5. **Print as CSS layer, not a portal** — PrintLayout is print stylesheets + dedicated print routes for passes/certificates, not a separate application surface.

## Final Review

| Surface | Supported |
|---|---|
| Public Website | YES — PublicLayout + primitives + content feature components |
| Event Experience | YES — EventExperienceLayout + scene registry + Experience components |
| Participant Portal | YES — ParticipantLayout + participant feature components |
| Organizer Portal | YES — OrganizerLayout + organizer feature components |
| CMS | YES — pending the §9.2 decision (either path is supported by this architecture) |
| Future Modules | YES — new surfaces are layouts + feature modules over the same primitives and tokens |

No blocking findings. Golden rule adopted: no screen is implemented before its components are defined here; pages are compositions — components are the product.
