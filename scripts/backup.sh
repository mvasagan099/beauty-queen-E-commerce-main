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
#   MYSQL_PASSWORD   Password of the MySQL application user (bq_user).
#   MYSQL_ROOT_PASSWORD  Root password used for the dump (defaults to MYSQL_PASSWORD).
#   RETENTION_DAYS   Number of days to keep backups (default: 30).
#
# This script is destructive only in the sense that it may delete OLD backups in
# the backup directory based on the retention policy. Run as a scheduled job.
set -euo pipefail

BACKUP_DIR="${1:-/var/backups/beauty-queen}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DB_NAME="beauty_queen"

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
docker compose exec -T mysql \
  mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines --triggers "$DB_NAME" \
  | gzip > "$FILE"

# Keep a stable 'latest' pointer (atomic-ish) for restore convenience.
cp "$FILE" "$LATEST"

echo "Backup written to $FILE"

# Retention: delete files older than RETENTION_DAYS.
find "$BACKUP_DIR" -name "backup-*.sql.gz" -type f -mtime +"$RETENTION_DAYS" -delete

echo "Backup complete. Files kept for $RETENTION_DAYS days."
ls -lh "$BACKUP_DIR"
