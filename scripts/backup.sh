#!/usr/bin/env bash
# Backup script for the Beauty Queen e-commerce application.
#
# Wraps mysqldump inside the docker-compose mysql service and stores the backup
# as a timestamped, gzipped SQL file. A retention policy deletes backups older
# than the configured number of days.
#
# Usage:
#   ./scripts/backup.sh [backup-dir]
#
# Environment:
#   MYSQL_PASSWORD      Password of the MySQL application user (bq_user).
#   MYSQL_ROOT_PASSWORD Root password used for the dump (defaults to MYSQL_PASSWORD).
#   RETENTION_DAYS      Number of days to keep backups (default: 30).
#   COMPOSE_FILE        Docker Compose file to use (default: docker-compose.yml).
#
# This script is destructive only in the sense that it may delete OLD backups in
# the backup directory based on the retention policy. Run as a scheduled job.
set -euo pipefail

BACKUP_DIR="${1:-/var/backups/beauty-queen}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DB_NAME="beauty_queen"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"

# Prefer the root password, fall back to the app user password.
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-${MYSQL_PASSWORD:-}}"
if [ -z "$MYSQL_ROOT_PASSWORD" ]; then
  echo "ERROR: MYSQL_ROOT_PASSWORD (or MYSQL_PASSWORD) must be set." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
DATE="$(date +%Y%m%d_%H%M%S)"
FILE="$BACKUP_DIR/backup-${DATE}.sql.gz"
LATEST="$BACKUP_DIR/latest.sql.gz"

echo "Creating database backup..."
docker compose -f "$COMPOSE_FILE" exec -T mysql \
  mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines --triggers --events "$DB_NAME" \
  | gzip > "$FILE"

# Verify backup is not empty
FILE_SIZE=$(stat -f%z "$FILE" 2>/dev/null || stat -c%s "$FILE" 2>/dev/null || echo "0")
if [ "$FILE_SIZE" -lt 100 ]; then
  echo "ERROR: Backup file is suspiciously small ($FILE_SIZE bytes). Check MySQL connectivity." >&2
  rm -f "$FILE"
  exit 1
fi

# Keep a stable 'latest' pointer for restore convenience.
cp "$FILE" "$LATEST"

echo "Backup written to $FILE ($FILE_SIZE bytes)"

# Retention: delete files older than RETENTION_DAYS.
DELETED=$(find "$BACKUP_DIR" -name "backup-*.sql.gz" -type f -mtime +"$RETENTION_DAYS" -delete -print | wc -l)
echo "Deleted $DELETED backups older than $RETENTION_DAYS days."

echo "Backup complete."
ls -lh "$BACKUP_DIR"
