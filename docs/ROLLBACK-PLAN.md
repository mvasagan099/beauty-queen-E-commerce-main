# Rollback Plan

Deployment -> problem detected -> rollback app -> database migration rollback
strategy -> restore service.

## Guiding principles

- Deploy the application and a schema migration are separate operations.
- A migration is forward-only by `prisma migrate deploy`. Never change
  production schema without understanding how to recover if something goes
  wrong.
- Prefer **backward-compatible** migrations (additive columns/indexes) so the
  previous application version can keep running while you roll back.
- A rollback is only as good as a *tested* restore. See
  [BACKUP-RESTORE.md](BACKUP-RESTORE.md).

## 1. Detect the problem

- Monitor `/api/health`, structured error logs (request id), 5xx rate,
  payment/queue failures and error tracking (if configured).
- Establish a clear signal (e.g. elevated error rate, failed webhook
  processing) before rolling back.

## 2. Rollback the application

```bash
# Redeploy the previous Docker image / tag
docker-compose down
docker-compose up -d --build api=previous-tag worker=previous-tag web=previous-tag
```

Steps:

1. Tag the current production image with a rollback-ready label before deploy.
2. On rollback, bring back the previous image for web, api, and worker.
3. Redis and MySQL are left running; the app re-connects.

If the migration was **backward-compatible**, the previous app version works
against the new schema with no DB action needed.

## 3. Database migration rollback strategy

For a forward-only migration that causes a problem:

- **If nothing has written incompatible data yet**: run the inverse SQL (the
  `DOWN` operations), e.g. drop the newly added column/index. Capture the
  inverse statements when writing the migration.
- **If data has been written**: do not hand-edit. Restore the database from the
  most recent clean backup and replay acceptable transactions (see
  BACKUP-RESTORE.md). A backup is not a rollback unless restore has been
  tested.
- Never run `prisma migrate reset` against production.

### Example inverse for Phase 11 index migration

```sql
-- DOWN: drop the Phase 11 hardening indexes
DROP INDEX `seller_email_idx` ON `seller`;
DROP INDEX `seller_mobile_idx` ON `seller`;
DROP INDEX `orders_order_date_idx` ON `orders`;
DROP INDEX `refunds_return_request_id_idx` ON `refunds`;
DROP INDEX `payment_webhook_events_payment_id_idx` ON `payment_webhook_events`;
```

## 4. Restore service

1. Bring up the previous application image.
2. Confirm `GET /api/health/ready` returns ok (DB reachable).
3. Run smoke tests:
   - login, products, product detail, cart, checkout, seller, admin.
4. Verify record counts vs expectations (see DATA INTEGRITY / REGRESSION
   docs).

## 5. Decision log

- Record: what was deployed, what broke, rollback/side taken, and the outcome.
- Add a regression test for the failure mode before redeploying.

## Environment ordering

Development -> staging (full E2E, test Razorpay keys) -> production. Never
promote a change that has not passed staging.
