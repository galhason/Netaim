# Hason Studio — Vision

The Studio is the experience for creators, as the Public Experience is the experience for visitors. Both belong to one product. This document is the Studio's north star; it inherits Master-Direction.md fully.

## What the Studio is

A creative workspace where organizers build event experiences. The organizer's mental model is "I am directing an event," never "I am managing records." Every surface answers one of three creator questions: *What am I making? How does it feel? Is it ready?*

## What the Studio is not

Not WordPress, not a classic CMS, not an admin panel, not enterprise software. Concretely banned: entity tables as navigation, widget-grid dashboards, settings-first screens, technical vocabulary in the interface (no "collections", "documents", "fields", "slugs" in organizer-facing copy), and any screen whose hero is a form.

## Philosophy

- **The event is the workspace.** Organizers do not browse entity types; they enter an event and everything about it surrounds them. Cross-event assets (people, media, templates) live in one Library.
- **Building happens on the truth.** The Experience Composer edits against the real rendered experience — the same Experience Engine the visitor sees — not an abstract form beside a thumbnail. What you shape is what ships.
- **Guide, never overwhelm.** Progressive disclosure everywhere: content first, presentation second, technology never. Empty states teach; defaults come from templates; the next step is always visible.
- **Calm is a feature.** The Studio uses the same editorial language: stone surfaces, the display serif for what matters, whitespace as rhythm, one accent used sparingly. A creator should end the day less tired, not more.
- **Reduce cognitive load structurally.** One primary action per screen, one place for every fact, status expressed as language ("Ready to publish") rather than badges-and-alarms.

## The Experience Composer — closer to Figma/Notion than WordPress, deliberately narrower than both

Direct manipulation of a *structured* medium. Scenes are the unit of creation: organizers reorder them as physical chapters, select one to edit its content in a focused panel while the live experience responds instantly. Unlike Figma, there is no freeform canvas — the structure is the guarantee that every published experience remains accessible, performant, responsive, and unmistakably Hason. Unlike WordPress, there is no disconnect between editing and result — preview is not a mode; it is the surface being edited.

Creativity is expressed through: scene selection and order, content and photography, experience profile (atmosphere, accent, motion intensity), per-scene variants — never through raw styling. The platform's design system is the instrument; the organizer plays it.

## Relationship to the technical foundation

The Studio is a product front-end over the approved engines (Identity, Organization, Event, Experience, Content, Media, Registration, Notification, Audit, Settings). It owns no domain logic. The recommended construction — a custom Studio application consuming Payload's Local/REST APIs, with the generated Payload admin retained as an internal operations tool only — resolves Component-Architecture §9.2 and is recorded in Product-Decisions.md (pending approval).

## Quality bar — the five-year test

Would this Studio still feel modern in five years? The bet is on properties that do not age: editorial typography, calm surfaces, direct manipulation, event-centric structure, and restraint. Trend-proofing comes from refusing trends. Would organizers enjoy it daily? The Home answers "what needs me" in one glance; the builder makes progress visible and reversible; publishing is a confident moment, not a risky one. Does it reduce complexity? The IA collapses fifteen potential areas into six. Does it encourage creativity? Templates start the work; the builder invites shaping; preview rewards it. Does it feel unmistakably Hason? Same stone, same serif, same silence.
