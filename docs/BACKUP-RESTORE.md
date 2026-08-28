# Backup and Restore

## Backup Strategy

### Database Backup

**Frequency**: Daily at 2:00 AM UTC
**Retention**: 30 days
**Storage**: Off-site (S3/GCS or separate server)

### Backup Commands

```bash
# Manual backup
docker-compose exec mysql mysqldump -u root -p beauty_queen > backup-$(date +%Y%m%d).sql

# Backup with gzip
docker-compose exec mysql mysqldump -u root -p beauty_queen | gzip > backup-$(date +%Y%m%d).sql.gz

# Automated backup script
#!/bin/bash
BACKUP_DIR="/var/backups/beauty-queen"
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec -T mysql mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" beauty_queen | gzip > "$BACKUP_DIR/backup-$DATE.sql.gz"
find $BACKUP_DIR -name "backup-*.sql.gz" -mtime +30 -delete
```

### What to Backup

1. **MySQL database** - All tables (products, orders, users, sellers, etc.)
2. **Upload directory** - Product images (`uploads/products/`)
3. **Environment files** - `.env` (securely)

## Restore Procedure

### Step 1: Stop Application

```bash
docker-compose stop api worker web
```

### Step 2: Create Fresh Database

```bash
docker-compose exec mysql mysql -u root -p -e "DROP DATABASE beauty_queen; CREATE DATABASE beauty_queen;"
```

### Step 3: Restore Database

```bash
# From uncompressed backup
docker-compose exec -T mysql mysql -u root -p beauty_queen < backup.sql

# From gzipped backup
gunzip < backup.sql.gz | docker-compose exec -T mysql mysql -u root -p beauty_queen
```

### Step 4: Run Prisma Migrations

```bash
docker-compose exec api npx prisma migrate deploy
```

### Step 5: Verify Data

```bash
# Check table counts
docker-compose exec mysql mysql -u root -p beauty_queen -e "
  SELECT 'products' as table_name, COUNT(*) as count FROM products
  UNION ALL SELECT 'orders', COUNT(*) FROM orders
  UNION ALL SELECT 'users', COUNT(*) FROM users
  UNION ALL SELECT 'sellers', COUNT(*) FROM seller;
"

# Run verification script
npx ts-node scripts/verify-migration.ts
```

### Step 6: Restart Application

```bash
docker-compose up -d
```

### Step 7: Smoke Test

```bash
# Health check
curl http://localhost:5000/api/health

# Test a few endpoints
curl http://localhost:5000/api/products
curl http://localhost:5000/api/categories
```

## Disaster Recovery

### Scenario: Complete Server Loss

1. Provision new server
2. Install Docker
3. Clone repository
4. Restore `.env` from secure backup
5. Restore database backup
6. Run `docker-compose up -d --build`
7. Restore images from backup
8. Verify and switch DNS

### Scenario: Database Corruption

1. Stop application immediately
2. Assess extent of corruption
3. Restore from most recent clean backup
4. Replay any transactions since backup (if possible)
5. Restart application

### Scenario: Application Bug

1. Rollback Docker images to previous version
2. Database rollback only if schema changed
3. Verify functionality

## Backup Monitoring

- Verify backup file size is reasonable
- Test restore monthly on staging environment
- Log all backup/restore operations
- Alert on failed backups

## Security

- Encrypt backup files at rest
- Restrict access to backup storage
- Rotate backup encryption keys
- Never store backup credentials in code
