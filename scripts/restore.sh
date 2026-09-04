#!/usr/bin/env bash
# Restore script for the Beauty Queen e-commerce application.
#
# Restores a gzipped mysqldump backup into the docker-compose mysql service.
#
# DANGER: This DESTROYS and REPLACES the database contents. Only run against a
# fresh/empty instance or when you intend to roll the database back. This is a
# DANGEROUS COMMAND and must not be part of normal deployment.
#
# Usage:
#   ./scripts/restore.sh <backup-file.sql.gz>
#
# Example:
#   ./scripts/restore.sh /var/backups/beauty-queen/backup-20260101_020000.sql.gz
#
# Environment:
#   MYSQL_PASSWORD        Password of the MySQL application user (bq_user).
#   MYSQL_ROOT_PASSWORD   Root password (defaults to MYSQL_PASSWORD).
#   DB_NAME               Database name (default: beauty_queen).
#   COMPOSE_FILE          Docker Compose file to use (default: docker-compose.yml).
#   SKIP_CONFIRM          Set to "yes" to skip interactive confirmation.
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <backup-file.sql.gz>" >&2
  exit 1
fi
BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

DB_NAME="${DB_NAME:-beauty_queen}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-${MYSQL_PASSWORD:-}}"
if [ -z "$MYSQL_ROOT_PASSWORD" ]; then
  echo "ERROR: MYSQL_ROOT_PASSWORD (or MYSQL_PASSWORD) must be set." >&2
  exit 1
fi

if [ "${SKIP_CONFIRM:-}" != "yes" ]; then
  echo "WARNING: About to DROP and recreate database '$DB_NAME' and restore from:"
  echo "         $BACKUP_FILE"
  read -r -p "Type 'yes' to continue: " CONFIRM
  if [ "$CONFIRM" != "yes" ]; then
    echo "Aborted."
    exit 1
  fi
fi

echo "Stopping application services that depend on the database..."
docker compose -f "$COMPOSE_FILE" stop api worker web || true

echo "Dropping and recreating database '$DB_NAME'..."
docker compose -f "$COMPOSE_FILE" exec -T mysql \
  mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "DROP DATABASE IF EXISTS $DB_NAME; CREATE DATABASE $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

echo "Restoring from backup..."
gunzip -c "$BACKUP_FILE" | docker compose -f "$COMPOSE_FILE" exec -T mysql \
  mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$DB_NAME"

echo "Applying any pending Prisma migrations..."
docker compose -f "$COMPOSE_FILE" exec -T api npx prisma migrate deploy --schema=../../prisma/schema.prisma || true

echo "Restore complete. Start the application services:"
echo "  docker compose -f $COMPOSE_FILE up -d --no-deps api worker web"
