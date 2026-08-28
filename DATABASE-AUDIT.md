# DATABASE-AUDIT.md — Beauty Queen E-commerce

## Database Overview

- **Engine:** MySQL
- **Driver:** mysql2 (with connection pooling)
- **Host:** Clever Cloud (bk2nvpf0xk0pinn1tpkl-mysql.services.clever-cloud.com)
- **Port:** 26141
- **SSL:** Required (ca.pem certificate from Aiven/Clever Cloud)
- **Connection Pool:** 10 connections, keepAlive enabled

## Tables

### Table: `products`

**Purpose:** Stores all product information including images, sizes, and pricing.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | INT AUTO_INCREMENT | No | auto | Primary key |
| name | VARCHAR(100) | Yes | NULL | Product name |
| price | INT | Yes | NULL | Selling price (INR) |
| description | TEXT | Yes | NULL | Product description |
| image | LONGBLOB | Yes | NULL | NOW stores path string like "image/123-0.webp" |
| mrp | INT | Yes | NULL | Maximum Retail Price |
| quantity | INT | Yes | NULL | Legacy total quantity (now size-specific) |
| ptype | VARCHAR(100) | Yes | NULL | Product type/category |
| image1 | LONGBLOB | Yes | NULL | 2nd image path |
| image2 | LONGBLOB | Yes | NULL | 3rd image path |
| image3 | LONGBLOB | Yes | NULL | 4th image path |
| image4 | LONGBLOB | Yes | NULL | 5th image path |
| size_s | INT | Yes | NULL | Small size stock count |
| size_m | INT | Yes | NULL | Medium size stock count |
| size_l | INT | Yes | NULL | Large size stock count |
| size_xl | INT | Yes | NULL | XL size stock count |
| size_xxl | INT | Yes | NULL | XXL size stock count |

**Primary Key:** `id`
**Foreign Keys:** None
**Indexes:** None (implicit on PK)
**Constraints:** None

**Known Issues:**
- `image`, `image1`-`image4` columns are LONGBLOB but now store file path strings (migration artifact)
- `quantity` column is legacy — actual stock is in size_s through size_xxl
- `price` and `mrp` are INT (no decimal support for prices)
- No NOT NULL constraints on critical fields
- No CHECK constraints on stock values (can go negative)
- No indexes on `ptype` (used in WHERE clauses frequently)

### Table: `orders`

**Purpose:** Stores customer order information.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | INT AUTO_INCREMENT | No | auto | Primary key |
| productid | INT NOT NULL | No | - | FK to products.id |
| name | VARCHAR(255) | Yes | NULL | Product name snapshot |
| size | VARCHAR(50) | Yes | NULL | Ordered size |
| price | DECIMAL(10,2) | Yes | NULL | Unit price |
| quantity | INT | Yes | NULL | Ordered quantity |
| subtotal | DECIMAL(10,2) | Yes | NULL | price * quantity |
| username | VARCHAR(255) | Yes | NULL | Customer name |
| email | VARCHAR(255) | Yes | NULL | Customer email |
| address | TEXT | Yes | NULL | Delivery address |
| pincode | VARCHAR(20) | Yes | NULL | Area pincode |
| district | VARCHAR(100) | Yes | NULL | District |
| landmark | VARCHAR(255) | Yes | NULL | Nearby landmark |
| payment_method | VARCHAR(50) | Yes | NULL | "COD" or "UPI - {id}" |
| status | VARCHAR(50) | Yes | 'Pending' | Order status |
| order_date | TIMESTAMP | Yes | CURRENT_TIMESTAMP | When ordered |

**Primary Key:** `id`
**Foreign Keys:** `productid` REFERENCES `products(id)` (defined in CREATE TABLE but may not be enforced if table was created incrementally)
**Indexes:** None (implicit on PK, FK)
**Constraints:** None

**Known Issues:**
- No `payment_status` field (paid, failed, refunded)
- No `payment_id` field (Razorpay payment ID not stored)
- No `order_group_id` (multi-item orders create separate rows, not grouped)
- `subtotal` is not computed — relies on frontend to pass correct value
- `price` comes from frontend, not validated against product table
- No index on `email` (used in WHERE for customer orders)
- No index on `status` (used in admin filtering)

### Table: `seller`

**Purpose:** Stores seller/admin authentication information.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | INT AUTO_INCREMENT | No | auto | Primary key (implied) |
| sellername | VARCHAR | Yes | NULL | Seller name |
| mobile | VARCHAR | Yes | NULL | Mobile number (used as login) |
| email | VARCHAR | Yes | NULL | Seller email |
| password | VARCHAR | Yes | NULL | PLAIN TEXT password! |
| repassword | VARCHAR | Yes | NULL | Re-entered password (also plain text) |

**Primary Key:** `id` (implied, not in query.txt)
**Foreign Keys:** None
**Indexes:** None
**Constraints:** None

**Known Issues:**
- Passwords stored in PLAIN TEXT (no hashing)
- `repassword` column is redundant and insecure
- No unique constraint on `mobile`
- No email validation
- No password complexity requirements
- Table CREATE statement not in query.txt (created manually or via different method)

### Table: `cust` (referenced but undefined)

**Purpose:** Unknown — referenced in sellerhome route.

**Location in code:** `server/router.js` line 941
```javascript
connection.query('select * from cust WHERE mobile=?',[smobile],...)
```

**Known Issues:**
- Table definition not found in query.txt
- Table may not exist (query may silently fail)
- Referenced for seller login check but logic ignores the result
- No CREATE TABLE statement anywhere in the codebase

---

## SQL Queries Inventory

### Products Table Queries

| Query Type | SQL | Location (router.js) | Parameters |
|------------|-----|---------------------|------------|
| CREATE TABLE | `CREATE TABLE IF NOT EXISTS products (...)` | Line 179 | None |
| SELECT all in stock | `SELECT * FROM products WHERE (size_s+size_m+size_l+size_xl+size_xxl) > 0 ORDER BY id DESC LIMIT 4` | Line 321 | None |
| SELECT by category | `SELECT * FROM products WHERE (size_s+size_m+size_l+size_xl+size_xxl) > 0 AND ptype=? ORDER BY RAND() LIMIT 6` | Lines 328-358 | Category name |
| SELECT random | `SELECT * FROM products WHERE (size_s+size_m+size_l+size_xl+size_xxl) > 0 ORDER BY RAND() LIMIT 4` | Line 363 | None |
| SELECT high price | `SELECT * FROM products WHERE (size_s+size_m+size_l+size_xl+size_xxl) > 0 ORDER BY price DESC LIMIT 4` | Line 370 | None |
| SELECT low price | `SELECT * FROM products WHERE (size_s+size_m+size_l+size_xl+size_xxl) > 0 ORDER BY price ASC LIMIT 4` | Line 377 | None |
| SELECT by ID | `SELECT * FROM products WHERE id = ?` | Line 966 | Product ID |
| SELECT related | `SELECT * FROM products WHERE (size_s+size_m+size_l+size_xl+size_xxl) > 0 ORDER BY RAND() LIMIT 4` | Line 985 | None |
| SELECT by IDs | `SELECT * FROM products WHERE id IN (?)` | Lines 1029, 1233, 1529 | Array of IDs |
| SELECT by category (full) | `SELECT * FROM products WHERE (size_s+size_m+size_l+size_xl+size_xxl) > 0 AND ptype=? ORDER BY RAND()` | Lines 483, 564, 646, 729, 815 | Category name |
| SELECT for search | `SELECT * FROM products WHERE name LIKE ? AND (size_s+size_m+size_l+size_xl+size_xxl) > 0` | Line 1786 | Search term |
| SELECT image | `SELECT image FROM products WHERE id = ?` | Lines 1690, 1750 | Product ID |
| SELECT image1 | `SELECT image1 FROM products WHERE id = ?` | Line 1879 | Product ID |
| SELECT all (admin) | `SELECT * FROM products` | Lines 940, 1657 | None |
| INSERT product | `INSERT INTO products (id, name, ..., image, image1, ..., image4) VALUES (...)` | Line 1409 | All product fields |
| UPDATE product | `UPDATE products SET id=?,name=?,price=?,description=?,mrp=?,size_s=?,size_m=?,size_l=?,size_xl=?,size_xxl=? WHERE id=?` | Line 1947 | All editable fields |
| DELETE product | `DELETE FROM products WHERE id=?` | Line 1904 | Product ID |
| UPDATE stock | `UPDATE products SET ${column} = ${column} - ? WHERE id=?` | Lines 1497-1498, 1579-1580 | Quantity, Product ID |

### Orders Table Queries

| Query Type | SQL | Location (router.js) | Parameters |
|------------|-----|---------------------|------------|
| CREATE TABLE | `CREATE TABLE IF NOT EXISTS orders (...)` | Line 202 | None |
| SELECT orders by email | `SELECT o.*, p.image, p.name AS product_name, p.price AS product_price FROM orders o JOIN products p ON o.productid = p.id WHERE o.email = ? ORDER BY o.id DESC` | Line 901 | Email |
| SELECT all orders | `SELECT o.*, p.image, p.name AS product_name, p.price AS product_price FROM orders o JOIN products p ON o.productid = p.id ORDER BY o.id DESC` | Line 1714 | None |
| SELECT order by ID | `SELECT * FROM orders WHERE id=?` | Line 1958 | Order ID |
| INSERT order | `INSERT INTO orders SET ?` | Lines 1482, 1561 | Order data object |
| UPDATE status | `UPDATE orders SET status=? WHERE id=?` | Line 1972 | Status, Order ID |
| DELETE order | `DELETE FROM orders WHERE id=?` | Line 1936 | Order ID |

### Seller Table Queries

| Query Type | SQL | Location (router.js) | Parameters |
|------------|-----|---------------------|------------|
| INSERT seller | `INSERT INTO seller(sellername,mobile,email,password,repassword) VALUES(?,?,?,?,?)` | Line 1624 | All fields |
| SELECT seller login | `SELECT * FROM seller WHERE mobile=? AND password=?` | Line 1645 | Mobile, Password |
| SELECT seller by mobile | `SELECT * FROM seller WHERE mobile=?` | Lines 941, 1658 | Mobile |

### Cust Table Queries

| Query Type | SQL | Location (router.js) | Parameters |
|------------|-----|---------------------|------------|
| SELECT cust | `SELECT * FROM cust WHERE mobile=?` | Line 941 | Mobile |

---

## Database Schema Issues

### Critical
1. **Plain text passwords** in `seller` table — no bcrypt hashing
2. **No CHECK constraints** — stock can go negative
3. **No FOREIGN KEY enforcement** — orders can reference non-existent products
4. **LONGBLOB columns** storing file path strings — schema/data mismatch

### High
5. **No indexes** on frequently queried columns (`ptype`, `email`, `status`)
6. **No UNIQUE constraint** on `seller.mobile`
7. **`cust` table** referenced but not defined
8. **`quantity` column** in products is unused/legacy

### Medium
9. **`price` and `mrp`** are INT — no decimal support
10. **No `created_at`/`updated_at`** on products table
11. **No soft delete** — products and orders are permanently deleted
12. **`repassword`** column in seller table is redundant

### Low
13. **No database migrations** — schema changes via raw ALTER TABLE
14. **No connection retry logic** — pool created once, no reconnection handling
15. **Mixed query styles** — callback-based, no consistent promise pattern
