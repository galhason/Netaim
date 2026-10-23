-- Registration health — read only.
--
-- Answers "did people who registered end up with an account, a password
-- and a place?" without printing anyone's address: emails are shown as
-- the first two letters and the domain. Nothing here writes.
--
--   psql "$DATABASE_URL" -f scripts/sql/registration-health.sql

\echo '1. Accounts made per day (last 14 days): with a password, with a live place'
SELECT date(p.created_at) AS day,
       count(*) AS accounts,
       count(*) FILTER (WHERE p.password_hash IS NOT NULL) AS with_password,
       count(*) FILTER (WHERE EXISTS (
         SELECT 1 FROM registrations r WHERE r.participant_id = p.id AND r.status <> 'cancelled'
       )) AS with_live_place
FROM participants p
WHERE p.created_at > now() - interval '14 days' AND p.anonymized_at IS NULL
GROUP BY 1 ORDER BY 1;

\echo '2. Recent accounts without a password or without a live place (last 30 days)'
SELECT p.id,
       left(p.email, 2) || '***@' || split_part(p.email, '@', 2) AS address,
       p.preferred_locale AS lang,
       p.created_at,
       (p.password_hash IS NOT NULL) AS has_password,
       (SELECT string_agg(r.status::text, ',') FROM registrations r WHERE r.participant_id = p.id) AS places,
       (SELECT max(s.created_at) FROM account_sessions s WHERE s.participant_id = p.id) AS last_session
FROM participants p
WHERE p.created_at > now() - interval '30 days'
  AND p.anonymized_at IS NULL
  AND (p.password_hash IS NULL OR NOT EXISTS (
    SELECT 1 FROM registrations r WHERE r.participant_id = p.id AND r.status <> 'cancelled'
  ))
ORDER BY p.created_at DESC;

\echo '3. Conference places cancelled within a day of being taken'
SELECT date(r.submitted_at) AS day, count(*) AS cancelled_same_day
FROM registrations r
WHERE r.status = 'cancelled' AND r.updated_at - r.submitted_at < interval '1 day'
GROUP BY 1 ORDER BY 1;

\echo '4. Addresses held by more than one account (any spelling)'
SELECT left(lower(btrim(email)), 2) || '***@' || split_part(lower(btrim(email)), '@', 2) AS address,
       count(*) AS accounts,
       string_agg(id::text, ',') AS ids
FROM participants
WHERE anonymized_at IS NULL
GROUP BY lower(btrim(email))
HAVING count(*) > 1;

\echo '5. Codes sent against registrations completed, per day (last 14 days)'
SELECT date(created_at) AS day,
       count(*) FILTER (WHERE type = 'participant.verifyEmail') AS codes_sent,
       count(*) FILTER (WHERE type = 'participant.verifyEmail' AND status <> 'sent') AS codes_not_sent,
       count(*) FILTER (WHERE type = 'registration.confirmed') AS confirmations
FROM notifications
WHERE created_at > now() - interval '14 days'
GROUP BY 1 ORDER BY 1;

\echo '6. Codes waiting now (sent, not yet used, not expired)'
SELECT count(*) AS waiting FROM email_verifications WHERE expires_at > now();

\echo '7. Sign-in blocks (five wrong passwords) in the last 7 days'
SELECT date(updated_at) AS day, count(*) AS blocks
FROM rate_limits
WHERE bucket LIKE 'sign-in:%' AND blocked_until IS NOT NULL AND updated_at > now() - interval '7 days'
GROUP BY 1 ORDER BY 1;

\echo '8. Accounts deleted and places cancelled from the Studio (last 30 days), and by whom'
SELECT date(created_at) AS day, action, actor_name, count(*) AS times
FROM audit_log
WHERE action IN ('participant.deleted', 'registration.cancelled', 'participant.blocked')
  AND created_at > now() - interval '30 days'
GROUP BY 1, 2, 3 ORDER BY 1, 2;
