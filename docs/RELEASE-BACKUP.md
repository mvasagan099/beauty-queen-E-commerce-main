# Release Backup — v2.0.0

**Created:** 2026-09-04
**Status:** BLOCKED — No Docker/MySQL runtime available

---

## Backup Procedure

The production backup is performed by `scripts/backup.sh` using mysqldump inside the Docker MySQL container.

### Manual Steps Required on Production Server

1. SSH into production server
2. Run:
   ```bash
   cd /opt/beauty-queen
   MYSQL_ROOT_PASSWORD="<root-password>" \
   RETENTION_DAYS=30 \
   bash scripts/backup.sh /var/backups/beauty-queen
   ```
3. Verify backup:
   ```bash
   ls -lh /var/backups/beauty-queen/latest.sql.gz
   ```

### Backup Verification Checklist

- [ ] Backup file exists and is non-empty
- [ ] Backup file is gzip-compressed
- [ ] Backup file size > 100 bytes (minimum sanity check)
- [ ] `latest.sql.gz` symlink updated
- [ ] Retention policy applied (old backups cleaned up)
- [ ] Backup timestamp recorded

### Backup Target

- **Location:** `/var/backups/beauty-queen/backup-YYYYMMDD_HHMMSS.sql.gz`
- **Format:** gzipped mysqldump
- **Flags:** `--single-transaction --routines --triggers --events`
- **Retention:** 30 days default

### Pre-migration Backup Requirements

Before running `prisma migrate deploy` in production:

1. Create backup using `scripts/backup.sh`
2. Verify backup integrity
3. Record database version/schema:
   ```bash
   docker compose exec -T mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" beauty_queen -e "SELECT VERSION(); SHOW TABLES;"
   ```
4. Record Prisma migration status:
   ```bash
   docker compose exec -T api npx prisma migrate status --schema=../../prisma/schema.prisma
   ```

### Restore Procedure

See `scripts/restore.sh`. **WARNING: Destructive operation.**

```bash
bash scripts/restore.sh /var/backups/beauty-queen/latest.sql.gz
```

Requires `SKIP_CONFIRM=yes` for automated execution.
