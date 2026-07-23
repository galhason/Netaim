# Identity & Permissions — Build Brief

A work order. The design is `docs/Identity-Architecture.md`; read it first
and do not re-litigate its decisions. This document says how to build it,
in order, with the exact files and the criteria for calling each part done.

Governing law: `docs/CONSTITUTION.md` and `docs/CONSTITUTION-V2.md`.

---

## 0. The goal in one paragraph

A person opens **one account on the platform** (not on a conference). From
it they join conferences — several at once, never two that overlap in time.
**Studio access is a role on that same account.** Nobody registers through,
sees, or manages a Payload user. Behind the scenes each account holding a
grant gets a *derived technical principal* in Payload, so the database keeps
enforcing access as a second, independent layer.

---

## 1. What already exists (verified — do not rebuild)

**Accounts and sign-in**
- `src/cms/collections/participants.ts` — the account. Required: organization,
  name, email. Also phone, `orgName`, `roleTitle`, dietary,
  `accessibilityNeeds`, `blocked`, `anonymizedAt`.
- `src/features/registration/services/participant-identity-service.ts` —
  `requestAccountLink` (platform-level, not tied to a conference),
  `consumeMagicLink`, `establishSession`, `currentParticipant`, `clearSession`.
  Tokens: single-use, 15-minute expiry, stored hashed.
- `src/infrastructure/payload/payload-participant-session.ts` —
  `issueForPlatform` finds or creates the account and provisions the owning
  organization on first use.
- `src/app/(frontend)/[locale]/enter/route.ts` — platform magic-link landing.
- `src/app/(frontend)/[locale]/me/` — account home, profile, actions.
- `src/features/account/` — `getMyAccount`, `joinConference`,
  `leaveConference`.

**Schedule rule (already enforced on the account join path)**
- `src/registration-engine/schedule/conflict.ts` + its test. A conference
  without `endsAt` occupies the remainder of its start day.
- **Gap to close in WP5:** the rule is *not* enforced on the per-conference
  form at `src/app/(frontend)/[locale]/events/[slug]/register/`. A signed-in
  guest can still bypass it there.

**Studio-side account administration**
- `src/features/studio/services/studio-participants.ts` and
  `src/features/studio/types/participants.ts` — `ParticipantAdminView`
  already carries the account's registrations per conference, plus
  `renameParticipant` and `setParticipantBlocked`.
- `src/app/(studio)/studio/(console)/participants/page.tsx`.

**Current Studio auth (this is what changes)**
- `src/features/studio/services/studio-auth.ts` — `getStudioCreator`.
- `src/features/studio/types/creator.ts` — `StudioCreator`,
  `StudioIdentityGateway`.
- `src/infrastructure/payload/payload-context.ts` — `actorContext()` returns
  `{ payload, user, organizationId }` from a **Payload user**;
  `getSystemPayload()` is the system escape hatch.
- `src/auth/grants.ts` — `relationshipId`, `OrganizationScope`.
- `src/cms/access-presets.ts` and `src/cms/access/` — collection access.

---

## 2. Non-negotiables

1. **Two enforcement layers, always.** Our capability check *and* Payload's
   access control. Never collapse to one.
2. **`overrideAccess: true` is forbidden on Studio write paths.** Allowed
   only for anonymous public reads, participant self-service and the outbox,
   and every use carries a comment naming why no actor exists.
3. **Deny by default.** A missing check refuses. Never "allow unless denied".
4. **Capabilities are re-read from the database on every privileged action.**
   Never stored inside the session cookie.
5. **Nothing above `src/infrastructure` imports Payload.**
6. **Do not rename the workshop status labels** (FR-004: פנויה / כמעט מלאה /
   מלאה / רשימת המתנה). Contractual.
7. Feature folder shape stays: `components/ hooks/ services/ types/ schemas/
   utils/ constants/ index.ts`.
8. Production code only — no TODOs, console.log, dead code, inline styles,
   magic numbers or emoji in source.

---

## 3. Work packages

Ship each package complete, gates green, before starting the next.

### WP1 — Permission engine (pure, no infrastructure)

**Create** `src/permission-engine/`:
- `capability/capabilities.ts` — the capability union and list:
  `platform:manage`, `experiences:manage`, `events:manage`,
  `registrations:manage`, `participants:read`, `participants:manage`,
  `checkin:operate`, `content:read`.
- `role/roles.ts` — `Owner`, `Producer`, `Editor`, `Door`, `Viewer` and the
  capability set each bundles.
- `grant/grant.ts` — `Grant = { role, eventSlug: string | null }`.
- `authorize/authorize.ts` — `can(grants, capability, eventSlug?)`.
  Unscoped grants apply everywhere; a grant scoped to conference X grants
  nothing on Y. Returns `false` when unsure.
- `index.ts` — the public surface.

**Tests** `tests/unit/permission-engine.test.ts`: an unscoped Owner passes
everywhere; a scoped `events:manage` passes on its conference and fails on
another; an empty grant list fails everything; an unknown capability fails.

**Done when:** pure functions only, no imports from `@/infrastructure` or
Payload, and the tests above pass.

### WP2 — Grants persistence

**Create** `src/cms/collections/account-grants.ts`:
`organization` (required), `account` (relationship → participants,
required, indexed), `role` (select, required), `event` (relationship →
events, optional — null means platform-wide), `grantedBy` (relationship →
participants), `grantedAt` (date). Admin group `Platform`. Access: readable
and writable only with `platform:manage` — never public.

Register it in `src/cms/index.ts` **and** in the `collections` array of
`src/payload.config.ts` (both places — forgetting the array is a known
trap).

**Create** the repository contract in `src/features/access/types/grant.ts`
(`listGrantsForAccount`, `listGrants`, `createGrant`, `revokeGrant`), the
adapter `src/infrastructure/payload/payload-grant.ts`, and wire it in
`src/infrastructure/index.ts`.

Relationship writes must coerce ids: `Number(relationshipId(...))`.

**Done when:** grants can be created, listed and revoked through the
repository, and `npm run generate:types` has been run.

### WP3 — Derived technical principal

The account is the source of truth. The Payload user is a derived artifact.

- On **first grant** for an account: ensure a Payload user exists, matched by
  the account's email, with a random unusable password and the organization
  scope the account belongs to.
- On **last grant revoked**, or the account being **blocked**: disable or
  remove that user, and revoke its sessions.
- The principal is **never** created by hand, shown in the Studio, or
  offered as a login. There is no "create user" screen.

Implement inside the grant service so the two always move together; a grant
without its principal, or the reverse, is a bug.

**Done when:** granting produces a working `actorContext()` for that account
and revoking removes it, proven by a test.

### WP4 — Staff session and the Studio door

- Studio sign-in reuses the platform magic link (`requestAccountLink`). No
  separate Studio login form, no password.
- `src/features/studio/services/studio-auth.ts` resolves the current account,
  loads its grants, and returns null when it holds none.
- `src/app/(studio)/studio/layout.tsx` refuses without a staff session. This
  is a coarse filter, **not** the only check.
- Staff session lifetime is shorter than a guest's. Blocking an account or
  changing its grants invalidates its sessions immediately (the
  `participant-sessions` collection already supports revocation).

**Done when:** an account with no grant cannot open any Studio route, and
revoking a grant logs that person out on their next request.

### WP5 — Write-path migration (the long, careful part)

Move every Studio action and repository onto explicit capability checks,
**one path at a time**, each with its own review. Order: events →
experiences/composer → registrations → participants → sponsors/sessions →
networking → media → organization/settings → notifications.

Close the known gap while here: enforce the schedule conflict rule on
`src/app/(frontend)/[locale]/events/[slug]/register/actions.ts` for
signed-in guests, using `findScheduleConflict` from `@/registration-engine`.

**Definition of done for every single path:**

- [ ] Requires a named capability; refuses when absent
- [ ] Re-derives the actor server-side; trusts nothing from the client
- [ ] Carries organization scope into the query
- [ ] Justifies any `overrideAccess: true` in a comment
- [ ] Validates input with a zod schema
- [ ] Writes an audit entry when it changes personal or privileged data
- [ ] Has a test proving it refuses without the capability

### WP6 — Studio surface

Extend `src/app/(studio)/studio/(console)/participants/page.tsx`:
- Show each account's grants beside its conferences.
- Grant and revoke a role, optionally scoped to one conference.
- Requires `platform:manage`.
- **The last `platform:manage` grant cannot be revoked.** A platform without
  an owner cannot be recovered from inside the product. Enforce in the
  service and prove with a test.
- Surface the audit entries for the account.

### WP7 — Break-glass

Block `/admin` in production (`src/app/(payload)/`), developer access only.
Document how to reach it in an emergency.

---

## 4. Gates

Run in this order. `generate:types` first whenever a collection changed —
without it typecheck fails on fields that do not exist yet.

```
npm run generate:types
npm run typecheck && npm run lint && npm run test && npm run build
```

Two traps worth knowing:

- **Never run `build` while `dev` is running.** They write to the same
  `.next` directory; the result is `SyntaxError: Unexpected end of JSON
  input`. Fix: stop dev, `Remove-Item -Recurse -Force .next`, restart.
- When the dev server asks *"is X created or renamed?"*, choose **create**.
  New tables and columns are additions, never renames.

---

## 5. Open decisions — get an answer, do not guess

1. Final role names and the exact capability list (§3 WP1 is a proposal).
2. Whether a conference may define roles beyond scoped grants.
3. Retention window for personal data, and what triggers anonymization.
4. Whether staff sign-in requires a second factor at launch.

---

## 6. Deployment constraints to respect while building

The system runs on a home server now and moves to external hosting later.

- Configuration only — no URLs, paths or secrets in code.
- No state in process memory; rate limiting needs shared storage.
- Media must move to object storage before the migration (still local disk).
- Versioned migrations must replace the interactive dev schema sync before
  production.
- `PAYLOAD_SECRET` and `REGISTRATION_LINK_SECRET` are regenerated at the
  move; that invalidates every session, which is intended.
- Email provider is deferred by decision but sits on the sign-in path, so it
  cannot be skipped before launch.

---

## 7. What not to do

- Do not add a "create user" screen. Accounts are opened by people.
- Do not put capabilities in the session cookie.
- Do not widen `overrideAccess: true` to make a Studio write pass.
- Do not remove Payload's collection access to simplify the migration.
- Do not replace the approved scene system or the Lounge design language
  while doing this work.
