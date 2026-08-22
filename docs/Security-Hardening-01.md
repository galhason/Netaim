# Security Hardening 01 — the boot and identity slice

Period: 2026-08-07
Scope: close the two severe identity findings, make abuse counters durable,
put security headers on every response, and stop the quality gates from
passing by not running. No product, UX, engine-contract or routing change.
Constitution reference: §22

## Completed

### 1. Token namespacing — the entrance-QR account-takeover path

The session cookie and the entrance token printed on a ticket QR shared
an identical construction:

```
participant_session = ${participantId}.${hmac(participantId)}
entranceToken       = ${registrationId}.${hmac(registrationId)}
```

`connect.` and `totp.` tokens were correctly namespaced; the entrance
token was not. Because participants and registrations draw from separate
Postgres sequences, id collisions are guaranteed — pasting a printed
entrance token into the session cookie authenticated the participant
whose id equalled that registration id.

Fixed by making the purpose part of the signed payload rather than a
convention each call site is trusted to remember. `src/shared/security/token-namespace.ts`
is now the only way to mint or read a signed token; a new token type
cannot forget to declare itself.

- `signedToken(purpose, parts)` / `verifySignedToken(purpose, token, expectedParts)`
- Signature comparison moved to `timingSafeEqual`; it was `!==` before.
- `expectedParts` guards the shape, so a longer token cannot be read as a
  shorter one.
- The duplicate session verification at `payload-context.ts` — a second,
  independent copy of the same HMAC check, which used `??` where the
  original used `||` — now calls the same module.

`tests/unit/token-namespace.test.ts` fails if any two purposes ever
produce the same signature again.

**Existing sessions are invalidated.** The cookie payload changed, so
every signed-in participant signs in again once. Deliberate: a
transitional accept-both period would have kept the vulnerable format
alive.

### 2. Environment proved at boot

`src/config/env.ts` declared a Zod schema requiring `PAYLOAD_SECRET` of at
least 32 characters, and `getServerEnv()` was never called anywhere. The
signing secret fell back to `''`, which makes every signature forgeable
by anyone who guesses the scheme.

- `assertServerEnv()` now runs once from `src/instrumentation.ts`, before
  the first request. It reports every problem at once rather than one per
  restart.
- The schema gained the pairs the codebase actually depends on: S3's
  three keys must be set together or not at all; Monday's two likewise.
- `PAYLOAD_DB_PUSH=true` in production is now a boot failure.
- Both secret readers refuse an empty value outright instead of hashing
  or signing with it.

### 3. Abuse counters, durable and shared

`signin-throttle.ts` held failures in a process-local `Map`: it reset on
every deploy and would be meaningless past one process. Deleted, along
with its test.

- `src/permission-engine/throttle/rate-limit.ts` — the policy as a pure
  decision. Five actions with their own allowances (`magic-link`,
  `registration`, `sign-in`, `check-in`, `connect`).
- `rate-limits` collection, closed to the access layer entirely
  (`platformOnlyAccess`), written by the limiter alone.
- The subject is hashed before it becomes a key, so the table never
  becomes a list of who tried to sign in.
- Applied to password sign-in, the TOTP second factor, and magic-link
  issuing — the last of which was completely unbounded and doubles as a
  mail relay and a way to fill the participants table.
- A blocked caller hammering a closed door does **not** extend its own
  block; otherwise an attacker could lock a victim out indefinitely by
  attacking them.
- A storage failure lets the attempt through, logged as an error.
  Refusing everyone when the counter table is unreachable would turn a
  database hiccup into a total sign-in outage.

`tests/unit/rate-limit.test.ts` covers the allowance, the window roll,
the block expiry, the lockout-attack case and the sweep predicate.

### 4. Security headers

`next.config.ts` had no `headers()` at all. Now every response carries a
CSP, `X-Frame-Options: DENY`, `nosniff`, `strict-origin-when-cross-origin`,
a Permissions-Policy that allows only the camera (the two QR scanners
need it), and HSTS in production.

`'unsafe-inline'` on scripts is required by Next's hydration bootstrap
and the Payload admin bundle. `'unsafe-eval'` is development-only.

### 5. Gates that actually run

- `vitest.config.ts` included only `tests/**`, so
  `src/registration-engine/schedule/conflict.test.ts` never ran once in
  its life. `src/**` added.
- `tests/integration/isolation.int.test.ts` — the only proof that
  organization isolation holds against a real database — skipped
  silently whenever `TEST_DATABASE_URL` was unset, which was every run.
  It still skips on a developer machine; on CI it now fails.
- `.github/workflows/gates.yml` runs typecheck, lint, unit tests, the
  isolation gate against a real Postgres, and the build.
- `npm run gates` runs the same sequence locally.
- `migrate`, `migrate:create` and `migrate:status` scripts added — the
  environment assertion points at them, and they did not exist.

## Architecture Review

No engine contract, repository interface, route or domain rule changed.
Two additions follow the existing shape: a pure policy module inside
`permission-engine`, and a repository contract declared by the
application layer (`features/access/types/rate-limit.ts`) and implemented
at the infrastructure seam. The token module sits in `shared` because
both a feature service and the infrastructure seam verify sessions, and
Foundation is the only layer both may import.

Rule 1 audit (Payload words outside `infrastructure`/`cms`) returns zero.

## What still needs doing before this is finished

1. **Run the gates on the authoritative machine.** `node_modules` here is
   a Windows install; the sandbox cannot execute vitest or next build.
   The two new pure modules were typechecked and executed standalone
   under `--strict` and all cases pass, but `npm run gates` has not run.
2. **`npm run generate:types`** — the `rate-limits` collection is not yet
   in `payload-types.ts`, so typecheck will fail until it is regenerated.
3. **Generate the first migration** and set `PAYLOAD_DB_PUSH=false`
   everywhere. The new collection is a good first migration to cut.

## Open decisions this slice surfaced

- **Session revocation.** The cookie is still a bearer credential with no
  expiry, nonce or version inside it: there is no sign-out-everywhere and
  no way to invalidate one account's sessions. Adding a version column to
  `participants` would fix it in a few lines, but it changes what a
  session means and wants approval.
- **`totpSecret` is stored in clear.** Encrypting at rest needs a key
  management decision.
- **Demo photographs.** Removing `i.pravatar.cc` and `picsum.photos` from
  `remotePatterns` was attempted and reverted: five services fall back to
  them when CMS content has no photograph, so removing the hosts breaks
  real pages. What a portrait without a photograph should render instead
  is a product decision, and it is the reason a real event can still show
  a fabricated face.
