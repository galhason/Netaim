# Email Delivery

## Why SMTP and not a provider SDK

Every provider worth using — Resend, SES, SendGrid, Postmark, Mailgun —
speaks SMTP, and so does a government mail relay and any Postfix on a
box. Choosing SMTP means **the provider is an environment variable, not
a code change.**

That matters here twice over: the deployment target is not settled, and
a public body may later be told which server its mail must leave
through. A vendor SDK would make either of those a rewrite. One
dependency (`nodemailer`) replaces a family of them.

## The gap this closed

Nothing had ever been sent, and the reason was not a missing provider.
`OutboxMessage` carried a `participantId` and **no address**, so a real
channel had nothing to deliver to — only the dev channel, which sends
nowhere, could satisfy the contract. The sign-in link made it worse by
calling `outbox.enqueue({ status: 'queued' })` directly, recording a
message that was never offered to a channel at all.

Both are fixed: the recipient is resolved at the composition root and
passed to `deliver` as a **separate argument**, and every send path goes
through one `sendNotification`.

The address is deliberately not a field on the record. `OutboxMessage`
is what gets persisted, and putting the address on it would copy every
participant's email into a second table that nothing needs it in. A test
asserts the address never reaches the record.

## Configuration

```
SMTP_HOST=smtp.example.org
SMTP_PORT=587
SMTP_SECURE=            # blank: implicit TLS on 465, STARTTLS elsewhere
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=no-reply@example.org
SMTP_REPLY_TO=          # optional
DISPATCH_SECRET=        # openssl rand -base64 32
```

`SMTP_HOST` and `SMTP_FROM` together are the minimum that can send.
Leave both blank and the platform records messages without delivering
them — the correct behaviour for local development, and unchanged from
before.

The boot assertion refuses to start on a half-configuration: a host
without a from-address, a user without a password, or SMTP configured
without a `DISPATCH_SECRET` (which would mean failed deliveries are
recorded and never retried, because the retry route stays closed).

## Retry

A relay refusing for a minute must not cost a guest their confirmation.
A failure is recorded with an attempt count, and reconsidered with
doubling backoff — 1, 2, 4, 8, 16 minutes — up to five attempts, then
left alone. Exhausted messages are kept, not deleted: an operator
reading the outbox should be able to see that the platform tried and
gave up.

Retries are driven by cron hitting a route, not by a timer inside the
process. A timer dies with the process and leaves a queue nobody drains,
and would run twice if the app were ever started as two instances.

```
* * * * * curl -fsS -X POST \
  -H "Authorization: Bearer $DISPATCH_SECRET" \
  http://127.0.0.1:3000/api/notifications/dispatch
```

The sweep sends **one message at a time**. A parallel burst against
someone else's relay is what gets a sender rate-limited or blocked.

## What is not sent by email

**Announcements.** `broadcastAnnouncement` writes in-app feed items that
appear in the guest's Updates; it records them as `sent` because the
feed *is* the delivery. Making announcements also send email would start
mailing every registrant of a conference — a change in what an organizer
is doing when they press the button, so it is a product decision rather
than an implementation detail. Flagged, not taken.

## Verifying on the server

1. Set the SMTP keys and `DISPATCH_SECRET`, restart. A half-configuration
   fails at boot with the specific problem named.
2. Request a sign-in link for an address you control. It should arrive.
3. `grep '"scope":"smtp"' logs/hason.log` — one `sent` line per message,
   never an address.
4. Break it on purpose: point `SMTP_HOST` at a closed port, request
   another link, confirm the outbox row reads `failed` with an attempt
   count, then fix the host and let cron retry it.

Step 4 is the one worth doing. Delivery that has never failed in testing
is delivery whose retry path has never run.
