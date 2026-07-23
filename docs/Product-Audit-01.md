# Hason — Product Audit 01 (Refinement Release)

A critique, not a changelog. No code, no new architecture. Judged as a product across five people: a first-time organizer, an experienced organizer, a government organization, an enterprise customer, and a participant. Grounded in the surfaces as they exist today. Brutally honest on purpose.

The headline: the *bones* are excellent — editorial calm, one accent, numbers as typography, the composer editing the live truth. The problem is not quality; it is **redundancy and exposure**. The Studio currently offers the organizer two ways to do several things, two empty rooms, and a set of controls that expose the machine underneath. The best version of this release deletes, it does not add.

---

## 1. Complete walkthrough — does it feel inevitable?

**Home.** Calm and correct. But three of its four questions are frequently empty: "Recently" has no source at all (it will always say "activity will appear here"), and "Upcoming" is blank for the common single-event organization. A first-timer meets a screen that is one-quarter alive. It reads as *scaffolding*, not *inevitability*.

**Create event.** The one genuinely inevitable moment: name it, land inside it. Nothing to fix here. This is the model everything else should imitate.

**Event workspace.** Here the product forks. The side journey has seven stops — Overview, Experience, People, Venue, Media, Registration, Launch — and at least three of them (People, Venue, Media) edit the *same content the Composer already edits as chapters*. The organizer is offered two doors to the same room. That is the central friction of the whole Studio.

**Experience Composer.** The best screen in the product. "Journey / Chapter / Find a chapter," edit on the live experience, the Identity dimensions written in real creative language. It is what the rest of the Studio should feel like. Two caveats: the Media reference is still "a photograph address for now" (you paste a URL you cannot pick from the Media you uploaded), and the whole Experience Identity panel currently changes nothing ("full effect arrives soon"). A control that does nothing is worse than an absent one.

**Registration.** Strong product language ("Who can attend? How many places?"). But its hero is a *form* — the one thing the Master Direction explicitly bans ("never a screen whose hero is a form"). The situation (capacity, who's waiting) is the emotional content; it sits *below* the settings form instead of leading.

**Participant area (/me).** For a signed-in participant it is currently mostly empty rooms: a real entrance code and status, then "your day will appear here," no people, no resources. Honest, but thin — it does not yet answer the excitement it promises.

**Launch.** Confident and clean. But it renders the *same* readiness score and the *same* findings the Overview already showed. Two screens, one truth.

**The verdict on Objective 1:** the journey is inevitable in two places (Create, Compose) and *redundant* in most others. The fix is subtraction.

---

## 2. Complexity audit — where the organizer has to think

Every item below is a decision the organizer should not have to make.

- **Two editors for one venue.** Venue is editable in the Composer's Venue chapter *and* in the standalone Venue area. Same content, two forms, two mental models. The organizer must learn which one "really" changes the page.
- **People and Media as separate destinations.** The Composer already places people (the People chapter) and photography (image fields). A separate People area and Media area duplicate that, in the exact "form beside a thumbnail" pattern the Vision bans.
- **Manual lifecycle buttons.** Overview offers "Move to Planning," "Move to Registration open," etc. These are the *engine's* phase machine exposed as buttons. Deciding to "move to registrationClosed" is not an organizer thought; it is plumbing. Most phase changes should be derived (a date passes, registration is configured), not clicked.
- **Enabling registration is a dead end.** The Registration area only appears when the event has the `registration` capability — but there is **no Studio control to turn that capability on**. The organizer who wants registration cannot get to the screen that configures it. (This is a true dead end, not a nit.)
- **Two locale models.** Venue has an explicit content-language switch; the Registration confirmation message (also localized) silently follows the UI language. The organizer learns two different rules for "which language am I editing."
- **Empty rooms.** Library and Insights are top-level areas that contain nothing but a promise. Every visit is a wasted decision ("maybe it's in Library?" → it isn't).

---

## 3. Navigation audit — could anything disappear or merge?

**Top level (Home, Events, Library, Insights, Organization).** Two of the five are empty. **Library and Insights should not be in the navigation until they hold something.** An organizer navigating to a room that teaches "this room is coming" is navigation punished. Bring them back the day they have content.

**Event workspace (seven stops).** This should be four.

- **Merge People, Venue, Media into the Composer.** They *are* chapters of the experience; editing them anywhere else is the duplication above. Keep People and Media only later as *Library* (organization-level reuse), never as event-workspace stops.
- **Fold Launch into Overview.** Overview already shows readiness and findings; Launch shows the same plus one button. Let Overview *be* the place you launch when it's ready. One fewer stop, one fewer identical screen.

Result: **Overview (with launch) · Experience · Registration · Program (future).** The organizer's chronology, with nothing that repeats.

Every remaining section then earns its place. Nothing today between People/Venue/Media does.

---

## 4. Workflow audit — interruptions and dead ends

- **Register → "To my personal area" → nothing.** After registering, the confirmation offers a link to the personal area, but registration does not sign the participant in (only the magic link does). Non-demo, that link resolves to 404. The single highest-emotion moment in the participant journey ends in a wall. (Fix is a decision, not code: either issue the session at confirmation, or change the words to "we've emailed your link.")
- **Approvals never reach Home.** The IA promised "approvals waiting" in Home's "Needs attention." It isn't wired — a Registration Manager has no signal until they open the event and the Registration area. The morning-glance promise is unmet.
- **The venue round-trip.** Editing venue in the Composer, then again in the Venue area, is an interruption of the "edit on the truth" model — you leave the live experience to fill a form that writes back to it.
- **Capability gap (again).** The create → configure-registration path is broken at the capability toggle. It is the clearest "dead end" in the Studio.

What flows well and must be protected: Create → workspace (no interruption); Compose (continuous); Launch as one confident action.

---

## 5. Language audit

The language is mostly exemplary (the Composer and Registration especially). Specific leaks:

- **"Move to {phase}" / "Next in the lifecycle."** "Lifecycle" and the phase names (registrationOpen, registrationClosed) are internal machine vocabulary shown to the organizer. Replace the concept, not just the words: derive phases, and where a manual moment is real, name it in product terms ("Open registration," "Close registration").
- **"Media" vs "photograph."** The area is called Media/מדיה, but every action inside it says "photograph/צילום." Pick one. Given the Master Direction ("photography is the interface"), the area should be **Photographs**, not Media.
- **Composer reorder verbs.** Hebrew "הקדמה/דחייה" (advance/defer) for move-up/down are legalistic; plainer motion words read calmer.
- **"Recently."** A heading that only ever renders "activity will appear here" is a label with nothing to label. Remove the heading until the feed exists.

---

## 6. Visual hierarchy audit

Hierarchy is a genuine strength: the hairline accent, the display serif for what matters, tabular numerals, whitespace as rhythm. Two places to make quieter and clearer:

- **Registration workspace is three screens stacked.** Builder form + capacity picture + participants list compete in one column. Lead with the *situation* (the capacity picture is the content), tuck settings behind an "Adjust registration" disclosure, and let participants breathe below. The form should never be the hero.
- **/me is mostly empty containers.** Empty sections ("your day," "networking," "resources") still render their headings, so the eye lands repeatedly on nothing. Until a section has content, it should not draw the eye — collapse it, don't stub it.

Otherwise: do not touch the composer, Home's continue block, or Launch. Those know exactly where the eye goes.

---

## 7. Consistency audit

- **Two content-editing paradigms.** The Composer (edit on the live truth — the approved D3/D4 model) versus the People/Venue/Media/Registration *forms* (edit beside the result). These are competing patterns inside one product. The forms should yield to the composer wherever the content is part of the experience.
- **Two localization interactions.** Explicit content-locale switch (Venue) vs implicit UI-locale (Registration message). Choose one rule for "what language am I editing" and apply it everywhere content is localized.
- **Button grammar is consistent** (solid = primary/irreversible, underline = secondary) and should be kept as the one interaction vocabulary.

The platform *does* feel like one product visually. It does **not** yet feel like one product *interaction-model*, because the composer and the forms disagree about how you edit.

---

## 8. Mobile audit (adaptive, not responsive)

- The workspace journey collapsing to a wrapping row and 44px targets is correct; approving from a phone and launching from a phone are first-class. Good.
- **The Composer is desktop-only creation** and does not recompose for management on a phone — which is *correct* per "desktop creates, mobile manages," but the phone offers no graceful "this is a desktop moment" hand-off; it just shows a cramped creation surface. Mobile should present the manage-view (readiness, approvals, open/close registration) and *point* to a larger screen for composing, rather than shrink the composer.
- **Registration's stacked form** is heaviest on a phone. The "situation first, settings behind disclosure" change (Objective 6) is a mobile win as much as a hierarchy one.

---

## 9. Participant audit — welcomed or processed?

Welcomed, then abandoned. The register form is calm; the confirmation copy is warm and human; the entrance code is real. Then:

- The "to my personal area" dead end (Objective 4) turns welcome into a wall.
- The personal area is mostly empty rooms; the emotional promise ("this is my event / my day / my people") is unmet because only status and code are real.
- In development the magic-link email only lands in an outbox the participant can't see, so the passwordless promise is invisible until a provider is connected.

None of these require new UI. They require: sign the participant in at confirmation; hide empty /me sections until they have content; and treat "email actually sends" as a launch blocker for real events.

---

## 10. Government / enterprise audit — would you trust it nationally?

Mostly yes, with three trust gaps:

- **Empty official rooms.** A government evaluator who clicks Insights and Library and finds "coming" reads *unfinished*. For this buyer, hide the unfinished rather than advertise it.
- **Exposed machinery.** Manual "move to lifecycle phase" buttons read as an internal tool leaking into a public-sector product. Accountability comes from the system deriving and recording state, not from an operator clicking phase transitions.
- **No visible accountability trail.** Approvals and cancellations happen with no organizer-visible record of who did what (the Audit engine is roadmapped but unsurfaced). Government and enterprise expect an answer to "who approved this participant, and when." That answer exists in the data model but nowhere on screen.

The isolation model, the calm professionalism, the passwordless participant identity, and the readiness gate on launch all *do* inspire trust. The gaps above are subtractions and surfacing, not new features.

---

## 11. Deletion report (mandatory)

Remove outright, now:

1. **Library** from the top navigation — until it holds reusable people/media/templates.
2. **Insights** from the top navigation — until it has a real measurement to show.
3. **Home "Recently"** section — until an activity source exists.
4. **Home "Upcoming"** heading when there are no upcoming events (render nothing, not an empty heading).
5. **Standalone Venue area** — the Composer's Venue chapter is the single door.
6. **Standalone People area and Media area** as *event-workspace stops* — editing lives in the Composer; reuse belongs to a future Library.
7. **Most "Move to {phase}" buttons** on Overview — derive phases; keep only genuine organizer moments (open/close registration).
8. **Launch as a separate stop** — its content is Overview's; the launch action lives on Overview.
9. **Experience Identity controls** in the Composer — hide until they actually change the experience; a control that does nothing should not be shown.
10. **Empty /me sections** — collapse until populated.

Net effect: five top-level areas → three; seven workspace stops → four; a Home that only shows what's alive; a Composer with no dead controls. Nothing of value is lost, because every deleted item is either empty, duplicated, or plumbing.

---

## 12. Director's recommendations (independent)

If I were starting Hason today, keeping the approved DNA:

- **One editing model, not two.** The Composer is the product's best idea and the platform's stated philosophy ("build on the truth"). I would make *everything about an event* — people, venue, photography, and even the registration invitation — a chapter or a property edited on the live experience, and delete every separate form that competes with it. The event workspace becomes: *the experience* (compose it), *registration* (who's coming), *overview* (is it ready — and launch). Three ideas.
- **Phases should be weather, not switches.** The organizer should never set a lifecycle phase. Dates and completeness derive it; the Studio narrates it ("Registration opens in 3 days"). Delete the manual machine.
- **Home earns its four questions or shows fewer.** Never render an empty promise. A Home with one honest living line beats a Home with four headings and three placeholders.
- **The participant journey must never dead-end.** Confirmation should *be* arrival in the personal area. That single continuity is worth more than any new participant screen.
- **Hide the unfinished.** For a government-grade product, an empty room is a liability, not a roadmap teaser. Ship narrow and whole; reveal rooms when furnished.

---

## 13. Priority list

Ordered by impact-to-effort, all subtractive or surfacing — none add scope.

**P0 — trust and dead ends (do first)**
1. Fix the register → personal-area dead end (session at confirmation, or honest wording).
2. Provide a Studio way to turn on registration, or auto-enable it when the organizer opens the Registration area — the current path is broken.
3. Hide empty rooms (Library, Insights, Home "Recently"/empty "Upcoming", empty /me sections).

**P1 — remove the duplication**
4. Make the Composer the single editor for venue, people, and photography; retire the standalone Venue/People/Media *editing* stops.
5. Merge Launch into Overview.

**P2 — remove the machinery**
6. Derive lifecycle phases; delete manual "Move to {phase}" buttons except open/close registration.
7. Registration workspace: situation first, settings behind disclosure (kills the "form as hero").

**P3 — language and polish**
8. Rename "Media" → "Photographs"; fix "lifecycle"/phase leaks; plainer composer reorder verbs.
9. One localization interaction everywhere content is edited.
10. Hide the Experience Identity controls until they take effect.

**Not now (surfacing, needs its engine):** approvals in Home "Needs attention," and a visible accountability trail — both wait on the Audit/notification surfacing already on the roadmap, but should be the first things built when those land.

---

## Closing

Hason does not have a quality problem; it has a *restraint* problem. It has quietly grown a second, form-shaped way to do what its beautiful Composer already does, kept two empty rooms lit, and let the engine's gears show through in a few places. This release should be remembered for what it removed. Delete the duplication, hide the unfinished, derive the machinery — and the product that remains will feel exactly as inevitable as its two best screens already do.
