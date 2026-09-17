#!/usr/bin/env bash
#
# The nightly copy.
#
# Everything the platform cannot regenerate lives in two places: the
# database (every registration, every account, every grant, the whole
# programme) and the media folder (the pictures and films the Studio
# uploaded, when they are not in object storage). Losing either one is
# not a setback, it is the conference.
#
# So both are copied, the copy is verified rather than assumed, and the
# verification is written down. A dump that ran, exited zero and
# contains nothing is the failure this script exists to catch — it is
# what a broken password, a renamed database or a full disk actually
# look like from the outside.
#
# Run it from cron, once a night:
#
#   0 3 * * * /var/www/hason/scripts/backup.sh >> /var/backups/hason/cron.log 2>&1
#
# The copies hold participants' names, addresses and phone numbers, so
# the directory is created 700 and every file 600, and it must never be
# put anywhere the web server can serve.

set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
DEST="${BACKUP_DIR:-/var/backups/hason}"
KEEP="${BACKUP_KEEP:-14}"
STAMP="$(date +%Y%m%d-%H%M)"

say() { printf '[%s] %s\n' "$(date +'%Y-%m-%d %H:%M:%S')" "$*"; }

# A dump that failed verification is deleted rather than left lying in
# the rotation folder: `restore.sh` takes the newest file it finds, and
# the newest file must never be one this script already disbelieved.
# Once it has passed, it stays — a later failure (the media copy, say)
# must not throw away a good copy of the database.
DUMP=''
VERIFIED=0
die() {
  if [ -n "$DUMP" ] && [ "$VERIFIED" -eq 0 ]; then
    rm -f "$DUMP" "$DUMP.toc"
  fi
  say "FAILED: $*" >&2
  exit 1
}

# ---------------------------------------------------------------- env

# The credentials are the application's, read from its own .env rather
# than repeated here — two copies of a password is how the backup comes
# to be the one using the old one.
[ -f "$APP_DIR/.env" ] || die "no .env at $APP_DIR"
DATABASE_URL="$(grep -E '^DATABASE_URL=' "$APP_DIR/.env" | head -1 | cut -d= -f2-)"
DATABASE_URL="${DATABASE_URL%\"}"
DATABASE_URL="${DATABASE_URL#\"}"
[ -n "$DATABASE_URL" ] || die "DATABASE_URL is not set in $APP_DIR/.env"

command -v pg_dump >/dev/null || die "pg_dump is not installed"

umask 077
mkdir -p "$DEST/db" "$DEST/media"
chmod 700 "$DEST" "$DEST/db" "$DEST/media"

# ----------------------------------------------------------- database

DUMP="$DEST/db/hason-$STAMP.dump"
say "dumping the database"
# Custom format: compressed, and restorable table by table.
pg_dump --format=custom --no-owner --no-privileges --file="$DUMP" "$DATABASE_URL" \
  || die "pg_dump refused"
chmod 600 "$DUMP"

# A dump is only a backup once something has read it back.
pg_restore --list "$DUMP" > "$DUMP.toc" 2>/dev/null || die "the dump cannot be read back"
for table in participants registrations events account_grants; do
  grep -q "TABLE DATA public $table" "$DUMP.toc" \
    || die "the dump does not contain $table — it is not a copy of this platform"
done
rm -f "$DUMP.toc"
VERIFIED=1

# And only a useful backup once the rows are in it. Recorded every
# night beside the file, so a count that collapses is visible in the
# log rather than discovered during a restore.
COUNTS="$(psql "$DATABASE_URL" -tA -F' ' -c "
  select 'participants=' || (select count(*) from participants)
      || ' registrations=' || (select count(*) from registrations)
      || ' events=' || (select count(*) from events)
      || ' media=' || (select count(*) from media);" 2>/dev/null || true)"
[ -n "$COUNTS" ] || COUNTS="counts unavailable"

SIZE="$(du -h "$DUMP" | cut -f1)"
say "database: $SIZE — $COUNTS"

# -------------------------------------------------------------- media

# A mirror rather than a dated tar: the folder holds films, and a full
# copy of it every night fills the disk the backups are meant to
# survive. `--delete` keeps it a mirror of the present; the database
# dumps are what carry the past.
if [ -d "$APP_DIR/media" ]; then
  if command -v rsync >/dev/null; then
    rsync -a --delete "$APP_DIR/media/" "$DEST/media/" || die "rsync of media refused"
  else
    cp -a "$APP_DIR/media/." "$DEST/media/" || die "copy of media refused"
  fi
  say "media: $(du -sh "$DEST/media" | cut -f1) mirrored"
else
  say "media: no local folder (object storage, or nothing uploaded yet)"
fi

# ------------------------------------------------------------ rotation

# Oldest first, keeping the newest $KEEP. Deliberately after the new
# dump has been verified: a night that fails leaves yesterday's copies
# where they are.
# shellcheck disable=SC2012 # the names are this script's own: hason-YYYYmmdd-HHMM.dump
mapfile -t OLD < <(ls -1t "$DEST"/db/hason-*.dump 2>/dev/null | tail -n +"$((KEEP + 1))")
for file in "${OLD[@]:-}"; do
  [ -n "$file" ] || continue
  rm -f "$file"
  say "rotated out $(basename "$file")"
done

# shellcheck disable=SC2012
say "done — $(ls -1 "$DEST"/db/hason-*.dump | wc -l) copies kept in $DEST/db"
