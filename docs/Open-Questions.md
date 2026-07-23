# Hason — Open Questions

The single consolidated list awaiting Product Owner decisions. Supersedes the scattered "Questions Before Next Task" lists; future sprints append here.

## Blocking the Studio roadmap

1. **D1–D7** — approved 2026-07-13 (Product Direction Addendum). The roadmap may proceed.
2. **Registration model scope** — RESOLVED 2026-07-16 (S3): **hybrid**. In-platform is the system of record; an explicit inbound/outbound integration seam (`RegistrationInboundGateway` / `RegistrationOutboundGateway`) is declared and reserved so an external/government system attaches later as an adapter without reshaping the engine. See Registration-Architecture.md §16.
3. **Payments** — RESOLVED 2026-07-16 (S3): **out of scope for v1**. Free events only; the `PaymentProvider` contract and a `paymentPending` status stay reserved (the status union omits `paymentPending` until a processor is chosen). Revisit if paid registration is required.
4. **Volunteer domain extension** — approve volunteers as participant subtype with assignments (required by the Volunteer Manager role).

## Blocking engineering quality gates

5. **Deployment environment** — cloud (which?) or on-premises; decides media storage (local vs S3-compatible), CDN/caching, migration workflow, and the local-dev PostgreSQL story. (Open since Development Report 01.) Partial decision 2026-07-16 (S3): **email delivery** is built as Notification architecture + outbox + dev/log channel, so confirmation emails and magic-link work without choosing a provider now; a real email provider drops in as one adapter at deployment. The deployment target and storage remain open.
6. **Test framework** — approve Vitest (or alternative) so the scripted-manual verifications become a permanent suite; S1's isolation gate needs it.

## Product decisions eventually needed (not blocking S1)

7. **Mobile navigation pattern** — the public header hides its menu below `md`; a pattern needs approval.
8. **Offline strategy** — the attendee entrance promises offline readiness; approve the service-worker + snapshot approach and its scope (entrance only vs whole journey).
9. **During-event mode** — scope of the live-day experience (now/next, room changes, push) for S5.
10. **Scene catalog governance** — who approves new scene types after launch (the platform team via architecture review is the working assumption).
11. **Accessibility base library** — RESOLVED 2026-07-15 (Release 0.8): **React Aria** (behavior hooks) is the standard for Studio composed widgets — unstyled, WCAG-grade, no styling opinions to fight the design system. Adopted when the first widget ships (the command-palette combobox); deliberately not installed in 0.8, which ships the palette/search as foundation only. See Development-Report-08.md §4.
12. **Experience Identity modeling** — the creative identity of each event (see Experience-Identity.md; supersedes the earlier "Experience Profile" naming). Concept approved; CMS field modeling needs approval before S4.

## Standing (operational)

13. **Local machine setup** — `npm install` and `git init` on Windows remain the user's one-time actions; PostgreSQL local install pending question 5.
