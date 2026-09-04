# Rollback Procedure — Beauty Queen E-Commerce

This document defines the step-by-step rollback procedures for the Beauty Queen E-Commerce application. Follow these instructions carefully when a production deployment fails or introduces critical issues.

---

## Rollback Triggers

Initiate a rollback immediately if any of the following conditions are observed after deployment:

- Health checks failing after deployment
- Error rate spike above 5%
- Payment processing failures
- Database migration failures
- Critical functionality broken (login, checkout, cart, admin dashboard)

---

## Frontend Rollback

Use this procedure to roll back only the frontend web application.

```bash
cd /opt/beauty-queen
git log --oneline -10  # Find previous good commit
git checkout <previous-commit-hash> -- apps/web/
docker compose -f docker-compose.prod.yml build web
docker compose -f docker-compose.prod.yml up -d --no-deps web
curl -sf http://localhost/  # Verify
```

Replace `<previous-commit-hash>` with the hash of the last known working commit. Confirm the frontend loads correctly by visiting the site or running the curl command above.

---

## Backend (API) Rollback

Use this procedure to roll back only the API server.

```bash
cd /opt/beauty-queen
git log --oneline -10
git checkout <previous-commit-hash> -- apps/api/
docker compose -f docker-compose.prod.yml build api
docker compose -f docker-compose.prod.yml up -d --no-deps api
curl -sf http://localhost/api/health/live  # Verify
```

Replace `<previous-commit-hash>` with the hash of the last known working commit. Confirm the API is healthy by checking the live health endpoint.

---

## Worker Rollback

Use this procedure to roll back only the background worker process.

```bash
cd /opt/beauty-queen
git checkout <previous-commit-hash> -- apps/api/
docker compose -f docker-compose.prod.yml build worker
docker compose -f docker-compose.prod.yml up -d --no-deps worker
```

Workers share the same codebase as the API. After rebuilding and restarting, verify worker logs for errors:

```bash
docker compose -f docker-compose.prod.yml logs --tail=50 worker
```

---

## Full Application Rollback

Use this procedure when the entire application stack must be rolled back. This affects the frontend, API, and worker simultaneously.

```bash
cd /opt/beauty-queen
git checkout <previous-commit-hash>
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d --remove-orphans
sleep 15
curl -sf http://localhost/api/health/live
curl -sf http://localhost/api/health/ready
curl -sf http://localhost/
```

Replace `<previous-commit-hash>` with the hash of the last known working commit. Wait at least 15 seconds after containers start before running health checks to allow services time to initialize.

Verify all three health checks pass before declaring the rollback successful.

---

## Database Migration Rollback

CRITICAL: Some migrations are irreversible. Follow this procedure exactly.

### Before Any Migration

1. Create a backup:

```bash
bash scripts/backup.sh /var/backups/beauty-queen
```

2. Review the migration SQL to determine if it is reversible.

### Migration Types and Rollback Strategy

- **Additive migrations** (new columns, new tables, new indexes): Safe to roll back by reverting the application code only. The database schema remains forward-compatible.
- **Destructive migrations** (dropped columns, dropped tables, altered column types): Cannot be undone without a database restore. You must restore from the backup created before the migration.

### Destructive Migration Rollback

1. Stop application traffic (put up a maintenance page or drain connections).
2. Restore the database from the backup:

```bash
bash scripts/restore.sh /var/backups/beauty-queen/<backup-filename>
```

3. Roll back the application code (see Full Application Rollback above).
4. Verify data integrity after restoration.
5. Document which backup was restored and why.

### Documentation Requirement

For every migration, document the specific rollback SQL in the migration file or a companion rollback file. This ensures that reversible migrations can be rolled back quickly without guesswork.

---

## Configuration Rollback

Use this procedure to roll back changes to deployment configuration, Docker Compose files, or Nginx configuration.

```bash
cd /opt/beauty-queen
git checkout <previous-commit-hash> -- docker-compose.prod.yml docker/nginx/
docker compose -f docker-compose.prod.yml up -d --remove-orphans
```

After applying, verify that all services restart cleanly:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=20
```

---

## Post-Rollback Verification

After completing any rollback, walk through the following checklist. Do not consider the rollback complete until every item passes.

- [ ] Health checks passing (`/api/health/live` and `/api/health/ready` return 200)
- [ ] Frontend loading (site renders without errors)
- [ ] Product browsing working (product list and detail pages load)
- [ ] Cart adding items (add to cart, update quantity, remove item)
- [ ] Login/logout working (authentication flow completes successfully)
- [ ] Payment checkout working (test with a sandbox/test payment)
- [ ] Admin dashboard accessible (admin login and dashboard load)

---

## Important Rules

- NEVER automatically destroy production data during rollback. Always make a backup first, even if one was already created before the failed deployment.
- ALWAYS backup before database rollback. No exceptions.
- ALWAYS verify health after rollback. Do not assume the rollback succeeded.
- Document which commit was rolled back to and why. Record this in the incident log or deployment notes for future reference.
