# Authorization Matrix

## Role Hierarchy

```
ADMIN > SELLER > CUSTOMER
```

## Access Control

| Feature | Customer | Seller | Admin |
|---------|----------|--------|-------|
| Browse products | Yes | Yes | Yes |
| Search products | Yes | Yes | Yes |
| Add to cart | Yes | Yes | Yes |
| Checkout | Yes | Yes | Yes |
| View own orders | Yes | Yes | Yes |
| Wishlist | Yes | Yes | Yes |
| Reviews | Yes | Yes | Yes |
| **Seller Features** | | | |
| Seller login/signup | Yes (public) | Yes | No |
| Seller dashboard | No | Yes | No |
| Manage own products (CRUD) | No | Yes | No |
| Manage own inventory | No | Yes | No |
| View own orders | No | Yes | Yes |
| Update order status | No | Yes (limited) | Yes |
| Seller profile | No | Yes | No |
| **Admin Features** | | | |
| Admin dashboard | No | No | Yes |
| Manage all products | No | No | Yes |
| Manage all orders | No | No | Yes |
| Manage all users | No | No | Yes |
| Manage sellers | No | No | Yes |
| Update user roles | No | No | Yes |
| Enable/disable sellers | No | No | Yes |

## Order Status Transitions

### Seller can transition:
```
Pending → Processing, Cancelled
Processing → Shipped, Cancelled
Shipped → Delivered
```

### Admin can transition:
```
Pending → Processing, Cancelled
Processing → Shipped, Cancelled
Shipped → Delivered
Delivered → (none)
Cancelled → (none)
Refunded → (none)
```

## Ownership Rules

- **Products**: Seller can only manage products where `product.sellerId === seller.id`
- **Orders**: Seller can only view/manage orders where `order.sellerId === seller.id`
- **Inventory**: Seller can only update stock for products they own
- **Admin**: Bypasses all ownership checks

## API Endpoint Access

| Endpoint | Customer | Seller | Admin |
|----------|----------|--------|-------|
| `GET /api/products` | Yes | Yes | Yes |
| `GET /api/products/:id` | Yes | Yes | Yes |
| `POST /api/products` | No | Yes (sets sellerId) | Yes |
| `PATCH /api/products/:id` | No | Yes (ownership) | Yes |
| `DELETE /api/products/:id` | No | Yes (ownership) | Yes |
| `GET /api/sellers/dashboard` | No | Yes | No |
| `GET /api/sellers/products` | No | Yes (scoped) | No |
| `GET /api/sellers/orders` | No | Yes (scoped) | No |
| `PUT /api/sellers/orders/:id/status` | No | Yes (ownership + transitions) | No |
| `GET /api/admin/dashboard` | No | No | Yes |
| `GET /api/admin/products` | No | No | Yes |
| `GET /api/admin/orders` | No | No | Yes |
| `GET /api/admin/users` | No | No | Yes |
| `GET /api/admin/sellers` | No | No | Yes |
| `PUT /api/admin/sellers/:id/status` | No | No | Yes |
| `PUT /api/admin/users/:id/role` | No | No | Yes |
| `GET /api/orders/all` | No | No | Yes |
| `PUT /api/orders/:id/status` | No | No | Yes (validated) |
| `GET /api/inventory/:productId` | No | Yes (ownership) | Yes |
| `PUT /api/inventory/:productId` | No | Yes (ownership) | Yes |
