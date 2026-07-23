# Hason Studio — Visual Language (Production)

The single visual language of the Studio. It inherits Master-Direction.md fully and makes its laws concrete for the organizer-facing product. Principles taken (never imitated) from Figma, Linear, Notion, Framer, Apple: restraint, editorial typography, calm surfaces, motion that explains. Tokens live in `src/styles/globals.css` — this document is their intent.

## Foundations

**Surface, not chrome.** One flat stone surface (`--color-surface`) is the workspace. A second, barely-lighter surface (`--color-surface-raised`) marks the few things that genuinely float. There is no third background, no panel-on-panel, no gradient.

**Ink and one accent.** Civic-ink text in two weights (`--color-text-primary`, `--color-text-secondary`); a single bronze accent (`--color-accent`) used only for the active state, the hairline mark, focus, and selection. Brand (`--color-brand`) is reserved for the one irreversible action (Launch, Register).

## Shell & navigation

The Studio's permanent identity is a **deep civic-ink sidebar** (`--color-sidebar`, the brand hue carried to low lightness) beside one calm stone content column — the references' principle (a persistent premium rail), rendered unmistakably Hason, never their black. The rail holds only real destinations (Home, Events, Organization), text-only (no decorative icons), the current place marked by a warm near-white label, a soft active surface, and a single bronze inline bar. Language and the creator sit at the foot of the rail. Text/surface pairs clear AA in both directions (`--color-sidebar-text` on `--color-sidebar`).

Navigation nearly disappears: the rail is global and stable; entering an event replaces the content — the event's name leads, its moment is stated in language, and its areas are calm underline **tabs**, not a second menu. On mobile the rail becomes a slim top bar (management, not a shrunk desktop). "Where am I" is always answered by the event's own header, never by chrome.

## Spacing & grid

Rhythm before rules. The base unit is `0.25rem`; layout breathes on a small set of steps (gaps of 3/6/8/12/16). Content sits in a single measure (`max-w-6xl` chrome, `max-w-2xl` reading) centered with generous inline padding (`px-5` → `md:px-12`) and vertical air (`py-10` → `md:py-14`). Sections are separated by whitespace, not boxes; a hairline (`border-border`) appears only between list rows, never around regions.

## Typography

The display serif (`--font-display`) carries what matters — an event's name, a readiness number, a section's one big idea. The body face (`--font-body`) carries everything else. Numbers are typography: large, `tabular-nums`, never a gauge. Secondary text steps down in color, not just size. Labels that orient (section headers) are small, `tracking-widest`, secondary — quiet signposts. Hierarchy is carried by weight, size and color, never by borders or fills.

## Borders & elevation

Whitespace before borders. Borders are hairlines (`--color-border`), used for row separation and the occasional field underline — never as decoration or containers. Elevation is used with extreme restraint: a single soft shadow (`--shadow-soft`) marks only what floats above the workspace — chiefly the **Composer canvas**, which now reads as a device resting on the surface, the live preview its hero. Nothing else in the Studio casts a shadow.

## Motion

One gesture. `rise` — a short, soft settle (opacity + 0.5rem translate, `--duration-slow`, `--easing-standard`) — is the only content-enter motion, applied once to the workspace surface. Toggles and links use opacity/colour transitions at `--duration-fast`. No parallax, no scroll effects, no decorative animation. Motion explains where a thing came from; it never performs. `prefers-reduced-motion` collapses every animation to an instant state change through the global override.

## Interaction states

- **Hover** — a quiet lift of opacity or an underline that draws in; never a colour flood.
- **Focus** — a visible accent ring (`2px`, `3px` offset, rounded) on every interactive element; keyboard use is a first-class path.
- **Active/selected** — accent colour and medium weight; the current place is always legible without a box around it.
- **Primary action** — the one brand-filled control per surface; secondary actions are underlined text. This is the whole button grammar.

## Loading & skeletons

When content is arriving, its shape is held by a `.skeleton` — a soft shimmer between the border and raised-surface tones, matched to the final element's rhythm — never a spinner. Reduced motion renders it as a calm static placeholder. Empty is never blank: every empty surface teaches or invites in one quiet line (the `EmptyState` component), never "no data."

## Adaptive intent

Desktop is the creative workspace (the Composer's three columns, room to shape). Tablet is the editing workspace (the same surfaces, columns relaxing to stacks). Mobile is the management workspace (readiness, approvals, launch — the side journey a wrapping row, every target ≥44px). The layout recomposes; it is not scaled down.

## The test

Would it stand beside Figma and Linear? It should read as calmer than both — an editorial workspace, not a tool bristling with affordances. The measure is disappearance: when the organizer is working, they should see their event, not the interface.
