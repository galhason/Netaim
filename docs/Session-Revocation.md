# Sessions that can be ended

## What was wrong

The session cookie was `session:<accountId>`, HMAC-signed, and nothing
more. Three consequences followed from the missing parts:

1. **It never expired.** `maxAge: 30 days` is a request to the browser —
   it governs when a browser stops sending the value. A copy taken from
   a shared computer, a profile backup, an extension or a proxy log and
   replayed by hand is not a browser and does not honour it. That token
   authenticated the account forever.
2. **Signing out did not sign out.** `clearSession` deleted the cookie.
   Nothing on the server changed, so any copy taken beforehand kept
   working.
3. **Rotating the secret was the only revocation** — and it would have
   invalidated the entrance, connect and TOTP tokens at the same time.

Two readers had each grown their own copy of the cookie name and their
own call to `verifySignedToken`: the identity service and the Payload
seam. Two verifiers of one credential can drift into disagreeing about
what a valid session is, and the more permissive one wins.

The platform's own TOTP ticket already carried an expiry. The session was
the one credential that did not.

## What it is now

`src/shared/security/session-token.ts` owns the cookie name, the
lifetime and the token's shape, because they are one decision. Both
readers go through it.

The cookie carries a **256-bit random session id and a signed expiry** —
not the account. Signing out ends the session on the server, so a copy
taken while it was live stops working too.

- The expiry is inside the signed payload, so the server decides and the
  answer is the same for every holder. Editing it breaks the signature.
- Only the **hash** of the session id is stored. A reader of the sessions
  table cannot produce a working cookie.
- The window is **absolute, not sliding**. A sliding window keeps a
  stolen token alive for as long as the thief keeps using it, which is
  the case it most needs to expire in. The cost: someone signed in
  continuously is asked to sign in again after 30 days.
- One row per device. Signing out of a laptop leaves the phone signed in;
  `clearAllSessions` ends all of them, which is the answer to a lost
  phone and the thing a password or 2FA change should trigger.
- Revocation is recorded (`revokedAt`), not deleted. A row that vanishes
  cannot answer *was this ended, or did it never exist* — the question
  asked after an account is misused.

`account-sessions` is deliberately **not** `participant-sessions`. That
collection holds single-use magic links: short-lived, consumed once.
These are long-lived and reusable. One table behind a `purpose`
discriminator would mean every magic-link query has to remember to
filter on it, and the one that forgot would let a session token be
consumed as a sign-in link — the same confusion the token purposes were
introduced to end.

## Order of operations

Both orderings are deliberate and are asserted:

- **Signing in:** open the record, *then* set the cookie. If the record
  fails, no cookie is written and the visitor is simply not signed in.
  The reverse would hand out a credential that resolves to nothing.
- **Signing out:** revoke the record, *then* delete the cookie. The
  reverse leaves a window in which the copy still works.

## One-time effect

Tokens in the old shape carry one part and are **refused**, not
grandfathered — they are exactly the permanent, account-naming tokens
being closed. Everyone signed in is signed out once. Signing in again is
normal after that.

## Before this runs

`account-sessions` is a new table. Locally: `PAYLOAD_DB_PUSH=true` in
`.env`, `npm run dev` until Ready, stop, remove the line. Then
`npm run gates`.

## Still open

- **`connect` and `entrance` tokens have no expiry**, for the same
  reason the session did not: they are signed over an id alone. Assessed
  separately; neither is a session, so neither grants account access.
- **No screen listing a guest's live sessions.** The capability to end
  them all exists; nothing surfaces it yet.
- **Expired rows are never swept.** One row per sign-in accumulates.
  Harmless at conference scale, but it is a table that only grows.
