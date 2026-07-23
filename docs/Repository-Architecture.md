# Hason — Repository Architecture

Repositories are product-defined interfaces implemented by infrastructure. The Studio owns the interface; Payload owns one implementation.

## Interfaces today

| Interface | Defined in (product) | Implementations |
|---|---|---|
| `ContentSource` | features/events/types | `payloadContentSource` (infrastructure), `demoContentSource` (development fixture) |
| `StudioIdentityGateway` | features/studio/types | `payloadIdentityGateway` (infrastructure) |
| `AttendeeContentSource` | features/attendee/types | demo fixture (Registration Engine delivers the live one) |
| `ComposerPersistence` | features/composer/types | reserved (S4) |

## The pattern

An interface is named for the product action it serves, returns product DTOs, and knows nothing about storage. An implementation lives under `src/infrastructure/<provider>/`, maps storage documents to DTOs at its own boundary, and is wired exactly once at the composition root. Two implementations already coexist per interface (live + demo), proving substitutability daily — a future headless CMS, custom API or static-snapshot provider is a third file and one wiring line.

## Organization isolation at this layer

Row-level scoping (S1) lives in the Payload implementation side (`cms/access.ts` factories over the pure grants resolver) — infrastructure enforcing a domain rule exactly once. Any future storage implementation must satisfy the same isolation contract; the DB-gated integration suite is the acceptance test any adapter has to pass.
