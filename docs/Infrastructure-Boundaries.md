# Hason — Infrastructure Boundaries

Payload is infrastructure, never product. This document records what lives on the infrastructure side and why it may.

## The infrastructure surface

| Path | Role |
|---|---|
| `src/infrastructure/index.ts` | composition root — the only meeting point of product interfaces and implementations |
| `src/infrastructure/selection.ts` | pure source-selection logic (testable without adapters) |
| `src/infrastructure/payload/payload-content-source.ts` | Payload implementation of the product `ContentSource`; maps storage documents to product models at the boundary |
| `src/infrastructure/payload/payload-identity.ts` | Payload implementation of `StudioIdentityGateway`; maps users to `StudioCreator` |
| `src/cms/**` | Payload collections, globals, and the access factories (`cms/access.ts`) that translate the pure Identity Engine into Payload row-level constraints |
| `src/payload.config.ts`, `src/app/(payload)/**` | Payload runtime and its internal operations admin (platform roles only, per D2) |

## The identity engine split

`src/auth` is now pure domain: roles, permissions, grants, scope resolution — zero framework imports. Its Payload-facing half (access factories returning `Where` constraints) moved to `src/cms/access.ts`, beside the collections that consume it. Isolation semantics are unchanged and covered by the same tests; only the location of the adapter changed.

## Replacement test

Replacing Payload = writing new implementations of `ContentSource` and `StudioIdentityGateway` (plus future repository interfaces as they appear) and rewiring `src/infrastructure/index.ts`. The Studio, the Composer, the engines, the public experience and the attendee journey require zero changes — verified by the dependency audit (zero Payload tokens above infrastructure) and by the suite passing with the demo source, which is exactly such an alternative implementation running in development every day.
