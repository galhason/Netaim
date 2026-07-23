# Networking Architecture

Status: approved scope ("הכל" — full module). Built in three layers, each a
complete vertical. Nothing here is hardcoded; all networking content is
participant-authored and event-scoped through the CMS.

## Purpose

Let participants at an event discover each other, connect, and meet 1:1.
Networking is opt-in per participant per event and never exposes a
participant who has not made their profile visible.

## Layers

### Layer 1 — Profiles (the base)

`networking-profiles` collection. One profile per (event, participant).

Fields: organization, event, participant (rel), headline, bio, interests,
links (array of {label,url}), visible (checkbox), availableForMeetings
(checkbox).

Surfaces: participant edits own profile; a public directory lists only
`visible` profiles for the event. No engine — profiles carry no state
machine.

### Layer 2 — Connections

`networking-connections` collection. A directed request between two
participants at an event.

Fields: organization, event, requester (rel), addressee (rel), status
(pending | accepted | declined), message.

Engine (`networking-engine/connection`): pure state machine
`pending → accepted | declined` (both terminal), plus an unordered
pair-key so a pair holds at most one active connection. The application
layer enforces uniqueness at the seam.

### Layer 3 — Meetings (1:1)

`networking-meetings` collection. A scheduled meeting between two
participants at an event.

Fields: organization, event, host (rel), guest (rel), startsAt, endsAt,
location, status (proposed | confirmed | cancelled).

Engine (`networking-engine/meeting`): pure overlap detection. A
participant cannot hold two confirmed meetings that overlap in time; the
application layer checks the participant's confirmed meetings before
confirming a new one.

## Layering & seams

Presentation → Application services (features/networking) → pure engines
(networking-engine) → repositories (interfaces in the feature) →
Payload adapters wired only at the composition root. Nothing above
`src/infrastructure` imports Payload. Participant reads/writes use the
system Payload with `overrideAccess: true`; organizer views use the actor
context.

## Build order

1. Profiles vertical (collection, feature, adapter, wiring, participant
   editor, public directory).
2. Connections vertical (collection, engine, feature, adapter, actions,
   participant surface: send / accept / decline).
3. Meetings vertical (collection, engine, feature, adapter, actions,
   participant surface: propose / confirm / cancel with conflict guard).
