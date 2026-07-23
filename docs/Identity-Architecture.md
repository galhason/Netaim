# Identity, Permissions and Security Architecture

Status: proposed. Awaiting approval before any implementation.
Governs: platform accounts, Studio access, authorization, session security,
data protection, and deployment portability.

Supersedes the two-identity model (CMS Users for the Studio, Participants
for the public side) described in Domain Blueprint §2.

---

## 1. The model

**One platform, one body.** Every conference lives under it.

**One account.** A person opens a single account on the platform — not on a
conference. From that account they join conferences; they may hold several
at once. The account is the source of truth for who someone is and for what
they are allowed to do.

**Conferences are joined, not signed up to.** Joining is an act inside the
account. The schedule rule already implemented applies: a guest may not hold
two registrations to conferences that overlap in time; to join an
overlapping conference they must first cancel the one they hold.

**Studio access is a property of the account.** There is no separate
administrator login. A person is given a role on their existing account, and
the Studio opens for them. Nobody ever registers through, sees, or manages a
Payload user.

---

## 2. Vocabulary

- **Account** — a person on the platform. Persisted as `participants`
  (the collection keeps its name; the concept is now "account").
- **Capability** — a single permission verb, e.g. `events:manage`.
- **Role** — a named bundle of capabilities, assigned to an account.
- **Grant** — a role assignment, optionally scoped to one conference.
- **Session** — a signed, server-recorded, revocable sign-in.
- **Technical principal** — a derived Payload user that exists only so the
  database layer keeps enforcing access. Never created by a person, never
  shown, never managed by hand. Created and revoked automatically with the
  grant.

---

## 3. Roles and capabilities

Capabilities are the unit; roles are convenience bundles. Deny by default:
anything not explicitly granted is refused.

| Capability | Meaning |
|---|---|
| `platform:manage` | Manage the platform, roles and grants |
| `experiences:manage` | Create and compose experiences |
| `events:manage` | Edit a conference's content and settings |
| `registrations:manage` | Approve, decline, cancel registrations |
| `participants:read` | See accounts and their registrations |
| `participants:manage` | Edit an account, block or unblock it |
| `checkin:operate` | Check people in at the door |
| `content:read` | Read Studio content without changing it |

Initial roles:

- **Owner** — every capability. At least one must always exist.
- **Producer** — experiences, events, registrations, participants, check-in.
- **Editor** — experiences and events only.
- **Door** — `checkin:operate` and `participants:read`.
- **Viewer** — `content:read`.

**Scoped grants.** A grant may name a conference. `events:manage` scoped to
one conference does not grant it on another. Unscoped grants apply platform
wide. This is the reason capabilities exist as a product concept rather than
an admin flag.

---

## 4. Authorization: defence in depth

No single gate. A request must pass every layer that applies to it. A layer
that is unsure refuses.

1. **Route guard.** Studio routes require a staff session. This is a
   coarse filter and is never the only check.
2. **Action check.** Every server action independently re-derives the
   account, its grants, and the capability the action requires. The
   interface is never trusted; a hidden button is not a permission.
3. **Repository scoping.** Every query and write carries the organization
   and, where relevant, the conference. Tenant isolation is enforced at the
   seam, so a missed check upstream still cannot read another body's data.
4. **Database layer.** Studio requests continue to execute as the account's
   derived technical principal, so Payload's own access control remains a
   second, independent enforcement layer.

**Rule:** `overrideAccess: true` is permitted only for genuinely
system-level paths (anonymous public reads, participant self-service,
outbox). It is forbidden on Studio write paths. Every use must be justified
in a comment naming why no actor exists.

---

## 5. Sessions

- Cookie: `httpOnly`, `SameSite=Lax`, `Secure` in production, signed with
  HMAC over a server secret.
- Server-recorded, therefore **revocable**. Blocking an account or changing
  its grants invalidates its sessions immediately.
- Staff sessions carry a shorter lifetime than guest sessions.
- Grants are re-read from the database on every privileged action. A session
  never carries capabilities inside the cookie — a stale cookie must not
  outlive a revoked role.

## 6. Sign-in

Passwordless, single-use, expiring links.

- Token is random, stored only as a hash, compared in constant time.
- Expires in 15 minutes; consumed exactly once.
- The reply never reveals whether an account exists.
- Rate limited per email and per address. **This requires shared state; an
  in-process counter is not sufficient once more than one instance runs.**
- Sensitive actions may require a fresh sign-in.

---

## 7. Granting Studio access

From the Studio's accounts screen (which already lists every account, its
conferences and its registration statuses):

1. An account holding `platform:manage` opens an account.
2. They assign a role, optionally scoped to a conference.
3. The system derives the technical principal and records the grant.
4. The change is written to the audit log and takes effect immediately.

Removing a grant revokes the principal and the sessions in the same step.

**Safety rule:** the last `platform:manage` grant cannot be removed. A
system without an owner cannot be recovered through the product.

---

## 8. Data protection

The platform holds names, emails, phones, dietary preferences and
**accessibility needs**. The last is health-adjacent and must be treated as
sensitive.

- **Minimise.** Collect a field only where a conference genuinely needs it.
- **Scope.** Accessibility and dietary data are visible only to roles that
  operate the event, never in public directories or networking surfaces.
- **Retain.** Personal data has a retention window; the existing
  anonymization engine turns an identity into a tombstone while attendance
  statistics survive. This must be wired to a real, scheduled process.
- **Export and erase.** A person may obtain their data and ask for deletion.
- **Audit.** Every privileged read or write of personal data is recorded:
  who, what, when.

---

## 9. Deployment portability

The system now runs on a home server and will move to external hosting.
Nothing may assume the current machine.

- **Configuration only.** No URLs, paths or secrets in code.
- **Secrets rotate at the move.** `PAYLOAD_SECRET` and
  `REGISTRATION_LINK_SECRET` sign sessions and sign-in links; whoever holds
  them can forge identity. New values are generated for production, which
  invalidates every existing session by design.
- **No in-process state.** Sessions already live in the database. Rate
  limiting must use shared storage.
- **Object storage for media before the move.** Local disk uploads do not
  survive managed hosting and are not shared between instances.
- **Versioned migrations before production.** The interactive schema sync is
  a development tool; production has nobody to answer its prompts.
- **Email provider before launch.** Once sign-in is a mailed link, delivery
  is part of the authentication path. Deferred by decision, but it is on the
  critical path and cannot be skipped.
- Outside the code, and required: TLS, database network isolation, backups
  with at least one rehearsed restore, and monitoring.

---

## 10. Build order

Each layer ships complete, with its gates green, before the next begins.

1. **Permission engine** — capabilities, roles, grant resolution. Pure
   functions, fully tested, no infrastructure.
2. **Grants and accounts** — schema for grants, the derived principal, and
   revocation.
3. **Staff session** — sign-in as staff, route guard, session revocation.
4. **Write-path migration** — every Studio action and repository moves to
   explicit capability checks, one at a time, each reviewed against the
   checklist below.
5. **Studio surface** — granting and revoking roles from the accounts
   screen; audit log visible.
6. **Break-glass** — Payload `/admin` restricted to developers and blocked
   in production.

**Definition of done for every write path:**

- [ ] Requires a named capability; refuses when absent
- [ ] Re-derives the actor server-side; trusts nothing from the client
- [ ] Carries organization scope into the query
- [ ] Justifies any `overrideAccess: true` in a comment
- [ ] Validates input with a schema
- [ ] Writes an audit entry when it changes personal or privileged data
- [ ] Covered by a test that proves it refuses without the capability

---

## 11. Honest limits

- This design reduces risk; it does not eliminate it. Security is a
  practice, not a feature.
- An independent security review is warranted before real personal data of
  thousands of people is entered.
- Roughly half of the protection lives outside this repository, in how the
  server, database and secrets are operated.

---

## 12. Open decisions

1. Role names and the exact capability list — the table above is a proposal.
2. Whether a conference may have its own roles beyond scoped grants.
3. Retention window length for personal data.
4. Whether staff sign-in requires a second factor at launch.
