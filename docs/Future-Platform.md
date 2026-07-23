# Hason — Future Platform

How the intended expansions fit the approved architecture without reshaping it. Nothing here is scheduled; everything here is provably compatible.

## Mobile App

The engines' contracts are transport-agnostic (Platform-Engines §6) and the attendee journey already consumes a serializable content contract. A mobile app is a second consumer of the same contracts: attendee journey, entrance QR (offline-signed tokens already designed), notifications as push channel. No engine changes; a public API layer exposes the contracts.

## Public API

A gateway exposing selected engine contracts (read: events, experiences, program; write: registrations) with organization-scoped API keys. The repository-level scoping makes tenant isolation hold automatically for API consumers.

## Portals (Speaker / Volunteer / Partner)

Each portal is a scoped surface over existing engines, exactly like the attendee journey: a speaker sees their sessions and materials (Content + Event engines); a volunteer sees assignments and shifts (Registration context extension); a partner sees their sponsorship presence and, if granted, aggregate insights. Portals are layouts + feature modules — the Component-Architecture already reserved this pattern.

## Kiosk Mode & Digital Signage

Consumers of published projections: a kiosk renders the experience or program in an auto-refreshing frame; signage renders "now/next" per room from the same program data. Both are read-only snapshot consumers — the offline/snapshot capability planned for attendees serves them directly.

## Badge Printing & Check-in Tablets

Devices of the Registration Engine: check-in tablets scan signed QR tokens (offline-capable, sync attendance); badge printing is a render target of the participant projection (print styles already exist as a layout concern). Device enrollment lives under Platform/Organization with least-privilege device tokens.

## Multi-event Organizations

Already native: organizations own events, libraries deduplicate people/media/templates across them, Insights compares across events. The IA was chosen for this from the start.

## White Label

Organization-level Tier-2 token overrides (the same mechanism as event themes, one level up — anticipated in Component-Architecture §8) plus domain mapping per organization. The design language remains the platform's guarantee; white-label recolors atmosphere, never structure.

## Template Marketplace

Templates are already products-in-waiting (copy-on-use, versioned snapshots). A marketplace adds a platform-scope library with review/publish workflow and licensing metadata. The strict-isolation default stays; sharing is explicit publication, never leakage.

## Guardrail

Every future item above enters through an existing seam: a new consumer of contracts, a new scoped surface, or a new library scope. If a future feature ever requires a new seam, it goes through architecture review first — that is the test that the platform has stayed extensible.
