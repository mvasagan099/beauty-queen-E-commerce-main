# Audit Logging

## Overview

The audit system records important administrative and system actions for security and compliance.

## Audit Log Model

```prisma
model AuditLog {
  id        Int      @id @default(autoincrement())
  action    String   @db.VarChar(100)
  entityType String  @map("entity_type") @db.VarChar(50)
  entityId  Int?     @map("entity_id")
  actorId   Int?     @map("actor_id")
  actorRole String?  @map("actor_role") @db.VarChar(20)
  details   Json?
  createdAt DateTime @default(now()) @map("created_at")
}
```

## Recorded Actions

| Action | Entity Type | When |
|---|---|---|
| `PRODUCT_CREATED` | Product | Admin/Seller creates product |
| `PRODUCT_UPDATED` | Product | Admin/Seller updates product |
| `PRODUCT_DELETED` | Product | Admin/Seller soft-deletes product |
| `PRODUCT_RESTORED` | Product | Admin/Seller restores product |
| `ORDER_STATUS_CHANGED` | Order | Admin/Seller changes order status |
| `ORDER_DELETED` | Order | Admin deletes order |
| `USER_STATUS_CHANGED` | User | Admin changes user role |
| `USER_ROLE_CHANGED` | User | Admin changes user role |
| `SELLER_STATUS_CHANGED` | Seller | Admin activates/deactivates seller |
| `COUPON_CREATED` | Coupon | Admin creates coupon |
| `COUPON_UPDATED` | Coupon | Admin updates coupon |
| `RETURN_APPROVED` | ReturnRequest | Admin approves return |
| `RETURN_REJECTED` | ReturnRequest | Admin rejects return |
| `REFUND_CREATED` | Refund | Refund process initiated |

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/admin/audit-logs` | Admin JWT | List audit logs with filters |

### Query Parameters

| Parameter | Type | Description |
|---|---|---|
| `action` | string | Filter by action type |
| `entityType` | string | Filter by entity type |
| `actorId` | number | Filter by actor ID |
| `actorRole` | string | Filter by role (ADMIN, SELLER, CUSTOMER) |
| `startDate` | ISO date | Filter from date |
| `endDate` | ISO date | Filter to date |
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page (max: 100) |

## Security

- Only ADMIN users can access audit logs
- Audit records are immutable (no update/delete endpoints)
- Sensitive information (passwords, tokens) is never stored in audit details
- Metadata contains only non-sensitive context (entity names, status changes)

## Frontend

- Admin Audit Logs page at `/admin/audit-logs`
- Supports filtering by action, entity type, and actor role
- Paginated results with action color coding

## What is NOT Audited

- Read-only operations (GET requests)
- Login/logout (handled separately by auth system)
- Routine data reads (product listings, order views)
- Internal system operations
