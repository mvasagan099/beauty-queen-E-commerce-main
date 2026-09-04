# Production Runbook

## Application Restart

```bash
cd /opt/beauty-queen
# Restart all services
docker compose -f docker-compose.prod.yml restart
# Restart specific service
docker compose -f docker-compose.prod.yml restart api
docker compose -f docker-compose.prod.yml restart worker
docker compose -f docker-compose.prod.yml restart web
# Verify
curl -sf http://localhost/api/health/live
curl -sf http://localhost/
```

## Deployment

```bash
cd /opt/beauty-queen
git pull origin main
docker compose -f docker-compose.prod.yml build
# Run migrations
docker compose -f docker-compose.prod.yml exec -T api npx prisma migrate deploy --schema=../../prisma/schema.prisma
# Rolling restart
docker compose -f docker-compose.prod.yml up -d --remove-orphans
sleep 15
curl -sf http://localhost/api/health/live
curl -sf http://localhost/api/health/ready
curl -sf http://localhost/
```

## Rollback

```bash
cd /opt/beauty-queen
git log --oneline -10
git checkout <previous-commit>
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d --remove-orphans
```

## Database Backup

```bash
cd /opt/beauty-queen
MYSQL_ROOT_PASSWORD="<password>" RETENTION_DAYS=30 bash scripts/backup.sh /var/backups/beauty-queen
```

## Database Restore

```bash
cd /opt/beauty-queen
MYSQL_ROOT_PASSWORD="<password>" bash scripts/restore.sh /var/backups/beauty-queen/backup-YYYYMMDD_HHMMSS.sql.gz
```

## Redis Restart

```bash
docker compose -f docker-compose.prod.yml restart redis
# Redis data is ephemeral cache/queue data - safe to lose
# BullMQ jobs in progress will fail and retry
```

## Worker Restart

```bash
docker compose -f docker-compose.prod.yml restart worker
# Or rebuild after code change:
docker compose -f docker-compose.prod.yml build worker
docker compose -f docker-compose.prod.yml up -d --no-deps worker
```

## Queue Failure Investigation

```bash
# Check worker logs
docker compose -f docker-compose.prod.yml logs worker --tail=100

# Check Redis connectivity
docker compose -f docker-compose.prod.yml exec redis redis-cli ping

# Check queue depth (requires admin auth via API)
curl -H "Authorization: Bearer <admin-token>" http://localhost/api/metrics/queues
```

## Payment Failure Investigation

```bash
# Check API logs for payment errors
docker compose -f docker-compose.prod.yml logs api --tail=200 | grep -i payment

# Check webhook events in database
docker compose -f docker-compose.prod.yml exec -T mysql \
  mysql -u root -p"$MYSQL_ROOT_PASSWORD" beauty_queen \
  -e "SELECT * FROM payment_webhook_events ORDER BY created_at DESC LIMIT 10;"

# Check payments table
docker compose -f docker-compose.prod.yml exec -T mysql \
  mysql -u root -p"$MYSQL_ROOT_PASSWORD" beauty_queen \
  -e "SELECT id, provider_order_id, provider_payment_id, status, failure_reason FROM payments ORDER BY created_at DESC LIMIT 10;"
```

## Email Failure Investigation

```bash
# Check worker logs for email errors
docker compose -f docker-compose.prod.yml logs worker --tail=100 | grep -i email

# Check BullMQ email queue
docker compose -f docker-compose.prod.yml exec -T mysql \
  mysql -u root -p"$MYSQL_ROOT_PASSWORD" beauty_queen \
  -e "SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10;"
```

## High CPU

```bash
# Find container using most CPU
docker stats --no-stream

# Check specific container
docker compose -f docker-compose.prod.yml top api
docker compose -f docker-compose.prod.yml top worker

# Restart high-CPU container
docker compose -f docker-compose.prod.yml restart api
```

## High Memory

```bash
# Check memory usage
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}"

# Restart container if needed
docker compose -f docker-compose.prod.yml restart api
```

## Disk Full

```bash
# Find large files
du -sh /var/lib/docker/volumes/*
du -sh /var/backups/beauty-queen/*

# Clean old backups
find /var/backups/beauty-queen -name "*.sql.gz" -mtime +30 -delete

# Clean Docker
docker system prune -f
docker volume prune -f
```

## Database Unavailable

```bash
# Check MySQL status
docker compose -f docker-compose.prod.yml exec mysql mysqladmin ping
docker compose -f docker-compose.prod.yml logs mysql --tail=50

# Check connections
docker compose -f docker-compose.prod.yml exec mysql \
  mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "SHOW STATUS LIKE 'Threads_connected';"

# Restart MySQL
docker compose -f docker-compose.prod.yml restart mysql
sleep 10
docker compose -f docker-compose.prod.yml restart api worker
```

## Redis Unavailable

```bash
# Check Redis status
docker compose -f docker-compose.prod.yml exec redis redis-cli ping

# Check memory
docker compose -f docker-compose.prod.yml exec redis redis-cli info memory

# Restart Redis
docker compose -f docker-compose.prod.yml restart redis

# Note: Application falls back to in-memory store when Redis is down
# BullMQ will fail to process jobs until Redis recovers
```

## API Outage

```bash
# Check all service health
docker compose -f docker-compose.prod.yml ps

# Check API logs
docker compose -f docker-compose.prod.yml logs api --tail=100

# Check if MySQL/Redis are up
docker compose -f docker-compose.prod.yml exec mysql mysqladmin ping
docker compose -f docker-compose.prod.yml exec redis redis-cli ping

# Restart API
docker compose -f docker-compose.prod.yml restart api
sleep 10
curl -sf http://localhost/api/health
```
