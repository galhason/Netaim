# Hason Platform — Event Experience Flow

Milestone 1 — Task 1.5. The request-to-render pipeline validating the full platform architecture.

## Flow

```
GET /he/events/[slug]  (or /en/…)
  → middleware (next-intl locale routing)
  → app/(frontend)/[locale]/events/[slug]/page.tsx
      locale guard → setRequestLocale → draftMode
  → getEventExperience(slug, locale, { draft })      Application Service
  → ContentSource                                     Content Service contract
      ├─ payloadContentSource   Payload Local API (events → experience → scenes, depth 2, localized, draft-aware)
      └─ demoContentSource      development fixture (double-guarded: NODE_ENV=development AND DEMO_CONTENT=true)
  → EventExperience (client boundary, registers scene library once)
  → ExperienceRenderer → Scene Registry → lazy scene components
```

Routes never touch Payload directly — content flows exclusively through the ContentSource contract behind the application service.

## Route States

| State | File | Behavior |
|---|---|---|
| Loading | `loading.tsx` | localized `role="status"` message |
| Error | `error.tsx` | localized `role="alert"` + retry; logged via platform logger |
| Not found | `[locale]/not-found.tsx` | localized, triggered by unknown locale, missing event, or missing route |

## Preview Foundation

`GET /api/preview?secret&slug&locale` enables Next.js draft mode and redirects to the event; `?exit=true` disables it. Guarded by `PREVIEW_SECRET` (route answers 404 when unset or wrong). With draft mode on, the content service queries Payload with `draft: true`. CMS "open preview" buttons will target this route in the CMS sprint.

## Demo Event (development only)

`DEMO_CONTENT=true` + development mode serves the `demo` event from a fixture: seven scenes in both locales, including one deliberately unregistered type (`spotlight`) that exercises graceful degradation end to end. Production ignores the flag entirely.

## CMS Change

`Scenes.content` (json, localized) was added — the engine contract requires a content payload per scene; scene content is validated by the scene type's Zod schema at render time. Per-type structured field schemas replace raw json when the CMS authoring sprint lands (CMS-Blueprint §3).

## Verification (all passed)

- Demo event resolves in both locales (7 scenes each); unknown slug → null → 404.
- End-to-end resolution renders 6 registered scenes and collects `spotlight:unknown-type` as a graceful failure.
- `tsc --noEmit` 0 errors; `eslint` 0 errors/warnings; `next build` exit 0 with `/[locale]/events/[slug]` as a dynamic route.
- Payload path requires a running PostgreSQL — pending the deployment/local-DB decision.
