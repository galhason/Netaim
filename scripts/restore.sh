#!/usr/bin/env bash
#
# Reading a backup back.
#
# This exists to be run when nothing is wrong. A backup nobody has
# restored is a file, not a backup, and the night the database is gone
# is the worst possible time to find out which of the two it was.
#
#   scripts/restore.sh                       # newest dump -> hason_restore_test
#   scripts/restore.sh /var/backups/hason/db/hason-20260916-0300.dump
#   scripts/restore.sh <dump> hason_restore_test
#
# By default it restores into a scratch database beside the live one
# and prints what came back, so the test costs nothing and risks
# nothing. Restoring *over* the live database is a different act and
# has to be asked for by name:
#
#   scripts/restore.sh <dump> hason --i-mean-the-live-database
#
# After a real restore, run `npx payload migrate` before starting the
# app: the dump carries the schema it was taken with, which may be
# older than the code now deployed.

set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
DEST="${BACKUP_DIR:-/var/backups/hason}"

say() { printf '%s\n' "$*"; }
die() { printf 'STOPPED: %s\n' "$*" >&2; exit 1; }

[ -f "$APP_DIR/.env" ] || die "no .env at $APP_DIR"
DATABASE_URL="$(grep -E '^DATABASE_URL=' "$APP_DIR/.env" | head -1 | cut -d= -f2-)"
DATABASE_URL="${DATABASE_URL%\"}"; DATABASE_URL="${DATABASE_URL#\"}"
[ -n "$DATABASE_URL" ] || die "DATABASE_URL is not set"

# shellcheck disable=SC2012 # the names are backup.sh's own: hason-YYYYmmdd-HHMM.dump
DUMP="${1:-$(ls -1t "$DEST"/db/hason-*.dump 2>/dev/null | head -1)}"
[ -n "$DUMP" ] && [ -f "$DUMP" ] || die "no dump to restore (looked in $DEST/db)"
TARGET="${2:-hason_restore_test}"
CONFIRM="${3:-}"

# The live database's name, taken from the URL rather than guessed.
LIVE="$(printf '%s' "$DATABASE_URL" | sed -E 's#.*/([^/?]+).*#\1#')"
if [ "$TARGET" = "$LIVE" ] && [ "$CONFIRM" != "--i-mean-the-live-database" ]; then
  die "$TARGET is the live database. Re-run with --i-mean-the-live-database if that is what you want."
fi

# Same server, same credentials, different database.
ADMIN_URL="${DATABASE_URL%/*}/postgres"

say "restoring $(basename "$DUMP") into $TARGET"
psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -q -c "DROP DATABASE IF EXISTS \"$TARGET\";" \
  || die "could not drop $TARGET (is something connected to it?)"
psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -q -c "CREATE DATABASE \"$TARGET\";" \
  || die "could not create $TARGET"

TARGET_URL="${DATABASE_URL%/*}/$TARGET"
# --no-owner: the dump was taken without owners, and the roles on a
# rescue machine are not the roles on this one.
pg_restore --no-owner --no-privileges --dbname="$TARGET_URL" "$DUMP" \
  || say "pg_restore reported problems — read them above before trusting this copy"

say ""
say "what came back:"
psql "$TARGET_URL" -tA -c "
  select '  participants  ' || count(*) from participants
  union all select '  registrations ' || count(*) from registrations
  union all select '  events        ' || count(*) from events
  union all select '  media         ' || count(*) from media
  union all select '  grants        ' || count(*) from account_grants;"

say ""
if [ "$TARGET" != "$LIVE" ]; then
  say "This was a test. Nothing live was touched."
  # The connection URL carries the password, so it is never printed.
  say "Drop it when you are done:"
  say "  sudo -u postgres psql -c 'DROP DATABASE \"$TARGET\";'"
fi
