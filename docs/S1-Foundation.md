# Hason — Milestone S1: Foundation Reviews

## Updated Architecture

The Identity Engine is now real. Authorization is a three-layer declaration with a single resolution point:

```
Role matrix        auth/permissions.ts — 8 roles × 11 permissions, one table
Grant resolution   auth/grants.ts — organizationsWithPermission(): the ONLY
                   place scope is computed (platform | organization set)
Access factories   auth/access.ts — scopedByOrganization / scopedCreate /
                   scopedSelfOrganization / scopedMembers / platformOnly
Access presets     cms/access-presets.ts — the three access shapes
                   (public content, org content, registration data)
Collections        declare a preset; contain zero permission logic
```

Users carry `grants[]` (role + organization + optional event). Grant integrity is a hook-level business rule: non-platform grants require an organization; managers assign grants only inside organizations they manage and never platform roles; the bootstrap first-user passes ungated (flagged in Security Review).

The Studio shell exists as boundaries only: `(studio)` route group with its own root layout, a request-rendered identity boundary (`getStudioUser` — the one place Studio resolves a session), navigation architecture (five areas, active state, bilingual chrome constants pending S2 localization), and Home's four editorial sections as empty structures. No dashboards, no fake content.

Infrastructure: Docker Compose ships `postgres` (dev, 5432) and `postgres-test` (5433); `.env.example` carries both URLs. Dev and production share the same PostgreSQL architecture; object storage + CDN are production concerns for the deployment sprint.

## Organization Isolation Review

Isolation is enforced once (Objective 1): every access rule funnels through `organizationsWithPermission`. Non-platform users receive row-level `Where` constraints on `organization` (or `id` for the organizations collection; or grant-membership for users). Creates are validated against the target organization in data. Published public content remains world-readable by design (the public experience); drafts (`readVersions`), mutations, organizations, users, participants and registrations are fully scoped. The public frontend uses the Local API (overrideAccess default) and is unaffected; REST/admin/`overrideAccess: false` paths are all constrained.

Escape hatches audited: Local-API calls with `overrideAccess: true` exist only in trusted server services (content sources, studio auth); none accept user input as query constraints.

## Security Review

Closed this sprint: role matrix with least privilege; grant-assignment guarding (no privilege escalation to platform roles, no cross-org grant assignment); draft reads locked behind `content:read`; users collection self-read only plus managed-members read. Open, tracked: first-user bootstrap is ungated (acceptable for development; must be locked before production — added to Open-Questions); event-level grant narrowing is stored but not yet enforced (org-level enforcement is the S1 guarantee; event narrowing is an S2 service-layer concern); rate limiting and session hardening belong to the Registration Engine sprint.

## Testing Review

Vitest is part of the architecture (approved): config with tsconfig-path resolution; `npm test`. 24 unit tests pass covering the role matrix (permission separation per role), grant scope resolution (platform/org/malformed grants), access-layer isolation (anonymous, member constraint shapes, foreign-org create rejection, platform bypass), and experience resolution (valid/unknown/invalid/disabled/duplicate-registration). The 5-test integration suite proves the exit gate against a real PostgreSQL through `overrideAccess: false` — org A's admin sees only org A's events and organizations, cannot update/create/grant into org B; it is gated on `TEST_DATABASE_URL` (docker compose `postgres-test`) and runs on any machine with the compose stack. Playwright fits later without restructuring: tests/ is framework-segmented and the app boots per environment.

## Future Studio Readiness

D2's shape is standing: the Studio is a custom application over Payload's APIs; the shell renders through the platform's own design language; identity is already resolved through Payload sessions; areas map one-to-one to the approved IA. S2 slots the Event Workspace and Composer inside existing boundaries — no reshaping required.

## The 5 → 5,000 events question

Yes, by construction: events are rows behind indexed organization scoping; access constraints are query-level (the database filters, not the application); published experiences are cacheable projections independent of event count; libraries deduplicate cross-event content; the Studio IA was chosen for many-event organizations (libraries + search, not entity trees). The known scale work is already scheduled: S6 load-validates the one high-write path (registration) and the caching strategy; media at scale is the deployment sprint's object-storage decision. Nothing in S1 assumes small numbers.
