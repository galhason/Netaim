# Hason — Dependency Rules

The law of the codebase. Every dependency flows downward; violations fail review.

```
Surfaces            app/(studio), app/(frontend), features/*/components
  ↓ may import
Application layer   features/*/services, features/*/constants, features/*/types
  ↓ may import
Domain engines      auth (pure), event-engine, experience-engine, shared, config
  ↓ implemented by
Infrastructure      src/infrastructure (composition root + adapters),
                    src/cms (Payload collections + access factories),
                    src/payload.config.ts, app/(payload)
  ↓
PostgreSQL
```

Hard rules:

1. **Payload words** (`payload`, `@payload-config`, `@/payload-types`, `@payloadcms/*`) may appear only in `src/infrastructure/**`, `src/cms/**`, `src/payload.config.ts`, `src/app/(payload)/**`, and the DB-gated integration tests. The audit command is part of review: a grep for those tokens outside those paths must return zero.
2. **Application services import infrastructure only through `@/infrastructure`** (the composition root). Never adapters directly, never Payload.
3. **Surfaces import only feature public APIs** (`features/x` index) and domain engines' public APIs. No component imports a repository, an adapter, or another feature's internals.
4. **Domain engines import only Foundation** (config, shared) and declared downward engine contracts (Experience → Event findings). Engines never import features, infrastructure, or React beyond types where a component contract requires it.
5. **Product language everywhere above infrastructure**: load experience, launch, find event, creator, journey. Collection/slug/query/document vocabulary is infrastructure-only.
6. **The composition root is the exemption point**: `src/infrastructure/index.ts` may import product interfaces and fixtures to wire them; nothing else holds that privilege.
