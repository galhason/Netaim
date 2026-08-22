# Development Report 18 — the networking feature, and a product model nobody had written down

Period: 2026-08-21
Scope: the migration adoption, then the community feature — its privacy
model, its missing authorizations, and the discovery that it was built on
a signal the product does not use.
Constitution reference: §22

---

## 1. Migrations are adopted

Baseline `20260821_063558`, recorded as applied without being run. The
full account is in `docs/Adopting-Migrations.md`, which is now a record
rather than a plan. Two things in it were wrong and are corrected there:
`PAYLOAD_DB_PUSH=false` was never what stopped the adapter pushing, and
the rehearsal on a restored copy was skipped deliberately on a
development database that can be rebuilt.

`payload.config.ts` now states `push` explicitly. It read
`...(env === 'true' ? { push: true } : {})`, which left the adapter's own
default in charge when the variable was off — and that default is on
outside production. **Every `npm run dev` had been reshaping the schema
while the environment said it was disabled.** That is how the database
stayed ahead of a migration history that did not exist.

Two scripts came out of it and are the way to repeat it on the server:
`scripts/db-status.mjs` reads and reports; `scripts/db-adopt-baseline.mjs`
records the baseline, refusing if the schema does not match or a real
history already exists, and printing the statement that reverses it.

---

## 2. The nav recognised you and sent you away

Signed in, the conference nav showed the visitor's own name — and
clicking it asked them to register.

`meHref` on the conference experience pointed at
`/[locale]/events/[slug]/me`, the lounge for one conference, which
redirects anyone without a registration for *that* conference to its
registration form. Every other surface pointed at `/[locale]/me`.

The first fix — changing the literal — was right and not enough: it would
also have taken a guest who *had* joined to the account home instead of
the lounge they were entitled to. **The real fault was structural.** The
destination lived in the experience descriptor, which is cached and
shared and therefore knows nobody, so it could not depend on who was
asking. The comment on `SceneViewer` says exactly this about the
visitor's name; the destination was not obeying it.

It now travels on `SceneViewer.href`, resolved per request from the
guest's own activity registrations: the lounge when they have joined,
the account home when they have not, sign-in when they are nobody.

---

## 3. The directory was showing everyone to everyone

`/me/networking` listed **every non-blocked participant on the
platform** — name, employer, role, interests, portrait — with no consent
check and no organization filter, while the page told the reader their
profile appeared "only if you choose to show it".

The `visible` checkbox existed. It governed a different page.

Every other read on this platform is scoped to an organization and an
integration test enforces it. This one was outside that discipline
entirely. It now reads `networking-profiles` with `visible` ticked,
scoped to the conference, and a test fails if an unscoped participant
read returns anywhere in `src/`.

---

## 4. Two gates that lived only in the interface

**`proposeMeeting`** checked that you were not inviting yourself and that
the times parsed. The dropdown offered only connected guests who had not
closed meetings — but the action read the guest's id straight from the
form. A hand-shaped request could put an appointment in the calendar of
someone who had never accepted a connection, and who had explicitly said
no to meetings.

**`requestConnection`** took the conference from a hidden input and never
checked that either party attends it.

Both now decide on the server. A filtered list is a courtesy; these are
the rules.

---

## 5. The model the product actually uses

This is the finding that mattered most, and it did not come from reading
code. It came from the Product Owner saying: *there is no creating a
conference — the conference is the site. There are workshops and talks.*

**`selectWorkshop` requires only a signed-in account.** It writes to
`session-registrations` and never touches `registrations`. But
`account.joined` — which the whole networking feature was built on — is
assembled from `registrations`.

So a guest could sign up for five workshops, be attending in every
meaningful sense, and the community page would tell them *"the community
starts at a conference — join one from your personal space"*, pointing at
a list they cannot act on because the conference is not something you
join.

Three things followed:

- **The directory is built from activity registrations.** Holding a place
  in a workshop is the evidence someone is here.
- **Suggestions lead with a shared room**, weighted `5` against `2` for a
  matching interest and `1` for the same employer. The card names the
  workshop: *"with you at …"*. A shared room is the only one of the three
  a guest can picture, and the only one they can verify.
- **Connections are read from the site's own conference**, not from a
  fan-out over conferences the account happens to hold — which had been
  missing them for everyone who never registered at the event level.

The empty state now sends people to the programme.

---

## 6. Scanning was withdrawn

By decision: badge QR is gone. `/me/badge`, `/me/scan` and
`/connect/[token]` redirect into the community page, because badges were
printed and a bookmark should land somewhere useful. The connect token,
`connectByToken` and `connectPreview` are deleted.

**Two leftovers were treated in opposite ways, deliberately.**

`'connect'` **stays** in `TOKEN_PURPOSES`, reserved and unused, with the
reason written at the line. The tokens on printed badges carry no expiry;
freeing the name would let a later feature mint `connect` tokens that a
photograph taken years earlier still satisfies — the exact confusion the
purpose list exists to prevent.

`'connect'` was **removed** from the throttle policies. Nothing throttles
a route that no longer exists.

The entrance pass, the door scanner and the authenticator QR are
untouched. They are different things that happen to use the same
technology.

**A mistake worth recording:** the deletion was done by cutting a line
range between two function names, and that range also contained
`connectionContactCard` — the vCard download, which has nothing to do
with scanning. A working feature was deleted on an assumption about what
sat between two landmarks. Typecheck caught it through the barrel export;
had it not, nothing would have, because that route has no test.

---

## 7. The promise, and the way out

**"We will let you know when it is accepted"** had been on the page since
the feature was written, with nothing behind it — no email, no record,
nothing in any feed.

`notifyParticipant` now writes a note to one person, and three rules hold
it:

- **Recording never blocks the act.** The connection stands whether or
  not the note is written.
- **These are not announcements.** They carry their own type, so they
  reach the personal feed and never the ticker that carries room changes.
  "Someone wants to connect" does not belong beside a production notice.
- **Only acceptance is announced.** Telling someone they were declined
  gives them nothing to act on; the request quietly leaving their list
  says it gently enough.

**An outgoing request could never be withdrawn.** `remove` refuses a
pending connection — correctly, since removing is something you do to a
relationship that exists — which left a request with no exit at all. The
engine gains `withdraw`, valid only from `pending` and only for the
sender; the receiver's answer is *decline*, which is a different act and
says a different thing. It lands on `removed`, not `declined`, because
nobody declined anything, and `removed` frees the pair to try again.

---

## 8. The conference chooses its own clock

`Asia/Jerusalem` was hardcoded in six places in one file, including the
pair that converts between the Studio's `datetime-local` inputs and
stored instants.

`events.timezone` is a new field with the zones a conference in Prague,
Berlin or New York would need. The formatters take it as a parameter and
fall back to a named constant.

**This fixed a real inconsistency:** the event networking page rendered
meeting times with `toISOString()` — UTC — while every other surface
showed venue time. The same 14:00 appointment read 12:00 on one page and
14:00 on another.

**Honest limit:** the field exists and the formatters accept it, but the
value is **not yet threaded to all 33 call sites**; most still take the
default. That is correct today because the conference is in Israel. A
conference in Prague needs a following slice, and it is a mechanical one.

---

## 9. Before this runs

`events.timezone` is a new column. This is the first change under the
adopted workflow:

```
npm run migrate:create
npm run migrate
```

The generated file should contain **only** the timezone column. If it
describes 78 tables, the baseline did not take and nothing should be run
until that is understood.

**Pacing, and my own failure at it.** The instruction in Report 17 was to
run `npm run gates` after each slice rather than accumulate two or three.
Four accumulated here — scanning, withdrawal, notices and the clock —
because "do everything remaining" was read as licence to keep writing.
It was not. The gate has caught something in the majority of the slices
it has run against, and each was a thing static reading had reported as
fine.

---

## 10. Still open

Unchanged from Report 17: the Console still needs sponsors, the People
directory, organization and team screens, media search and registrant
filters before `(classic)` can be deleted; the two permission systems are
still two; `experience-engine` still has two readers.

New, from reading the networking feature end to end:

- **No block and no report.** A guest can mute or remove a connection.
  There is nothing for someone who is being harassed, which is a gap a
  public body will ask about.
- **Meeting conflicts are checked one-sided and without a transaction.**
  Only the guest's calendar is consulted, so a host can be double-booked,
  and two concurrent confirmations can both pass.
- **`availableForMeetings` is written and never read.** The actual gate
  is `contactPrefs.meetings` on the participant — a different field in a
  different collection. One of them should go.
- **Chat has no rate limiting** and no pagination past the newest 200.
- **The profile is split across two pages** and the one a guest would
  naturally open, `/me/profile`, has no directory-visibility control and
  no link to the page that does.
