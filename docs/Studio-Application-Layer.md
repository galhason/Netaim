# Hason — Studio Application Layer

Every Studio action passes through one application service. Services orchestrate repositories, domain engines, identity and permissions; they contain no rendering, no React, no storage vocabulary.

## Services in place today

| Service | Product action | Composes |
|---|---|---|
| `getEventExperience` (features/events) | Load Experience (draft or launched, per locale) | ContentSource via composition root |
| `getStudioCreator` (features/studio) | Who is creating | StudioIdentityGateway |
| `getStudioHome` (features/studio) | What does this event need right now | Load Experience + Inspector + EventHealth |
| `getAttendeeExperience` (features/attendee) | Load the companion journey | AttendeeContentSource (demo; Registration Engine next) |

## Services reserved by contract (arrive with their milestones)

`ComposerPersistence` (save draft / history / restore / submit for review / launch — S4) is the declared LaunchApplicationService seam; Registration/Participant services follow the Registration-Engine-Blueprint (S3); Media follows the Library (S4). Contracts precede implementations — surfaces already compose against them.

## Rules

Services speak product language only; they are transport-agnostic (a mobile app, CLI, AI assistant or API route calls the same functions — nothing in them assumes a browser); they never expose storage models — every return type is a product DTO; and nothing bypasses them: components and routes have no other door to data.

## Future readiness (Objective 8, verified)

Mobile/desktop/CLI/automation/AI/API/batch all reduce to "call an application service with plain arguments and receive a serializable product model." The suite proves the pattern: unit tests call the services and engines with zero React, zero HTTP and zero Payload.
