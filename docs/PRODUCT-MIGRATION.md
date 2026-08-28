# Product Migration Documentation

## Database Schema Mapping

### Legacy MySQL Table: `products`

| Legacy Column | Prisma Field | Type | Notes |
|---|---|---|---|
| id | id | Int @id @default(autoincrement()) | Auto-increment primary key |
| name | name | String? @db.VarChar(100) | Product name |
| price | price | Int? | Selling price in INR |
| mrp | mrp | Int? | Maximum Retail Price |
| description | description | String? @db.Text | Product description |
| quantity | quantity | Int? | Legacy total quantity field |
| ptype | ptype | String? @db.VarChar(100) | Category: saree, kurthi, top, leggin, cosmetics |
| image | image | String? @db.LongText | Main product image path |
| image1 | image1 | String? @db.LongText | Additional image 1 |
| image2 | image2 | String? @db.LongText | Additional image 2 |
| image3 | image3 | String? @db.LongText | Additional image 3 |
| image4 | image4 | String? @db.LongText | Additional image 4 |
| size_s | sizeS | Int? | Stock quantity for size S |
| size_m | sizeM | Int? | Stock quantity for size M |
| size_l | sizeL | Int? | Stock quantity for size L |
| size_xl | sizeXl | Int? | Stock quantity for size XL |
| size_xxl | sizeXxl | Int? | Stock quantity for size XXL |
| deleted_at | deletedAt | DateTime? | Soft delete timestamp |
| created_at | createdAt | DateTime? @default(now()) | Creation timestamp |
| updated_at | updatedAt | DateTime? @updatedAt | Last update timestamp |

### Categories

Categories are stored as the `ptype` string field on products. There is no separate categories table.

Existing categories (preserved exactly):
- `saree` - Saree
- `kurthi` - Kurthi
- `top` - Top
- `leggin` - Leggin
- `cosmetics` - Cosmetics

### Image Storage

Images are processed with Sharp:
- Resized to 800x1000px (cover fit)
- Converted to WebP format (quality 80)
- Stored in `uploads/products/` directory
- Named as `{timestamp}-{index}.webp`
- Referenced in DB as `uploads/products/{filename}`

### Size System

Each product has per-size stock quantities stored as individual columns:
- sizeS (Small)
- sizeM (Medium)
- sizeL (Large)
- sizeXl (XL)
- sizeXxl (XXL)

This is the legacy structure. Future normalization could convert to a separate sizes table.

### API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /api/products | Public | List products with pagination/filtering |
| GET | /api/products/homepage | Public | Homepage product data |
| GET | /api/products/search?q= | Public | Search products |
| GET | /api/products/:id | Public | Single product details |
| GET | /api/products/admin/all | Seller/Admin | All products for management |
| POST | /api/products | Seller/Admin | Create product with images |
| PATCH | /api/products/:id | Seller/Admin | Update product |
| DELETE | /api/products/:id | Seller/Admin | Soft delete product |
| POST | /api/products/:id/restore | Seller/Admin | Restore deleted product |
| GET | /api/categories | Public | List all categories |
| GET | /api/categories/:slug | Public | Get category by slug |

### Product Query Parameters

| Param | Type | Default | Description |
|---|---|---|---|
| category | string | - | Filter by ptype |
| search | string | - | Search name, description, category |
| sort | string | id desc | price_asc, price_desc, newest, name_asc, name_desc |
| page | number | 1 | Page number |
| limit | number | 20 | Items per page |

### Response Format

```json
{
  "success": true,
  "products": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### URL Compatibility

Legacy URL `/singlepro/:id` redirects to `/product/:id` via Next.js redirects.

### Data Integrity Notes

- Product names are preserved exactly as in the database
- Product descriptions are preserved exactly
- Prices and MRP are stored as integers (INR paise not used)
- Category names are lowercase (saree, kurthi, top, leggin, cosmetics)
- Size labels are: Small, Medium, Large, XL, XXL
- Images are migrated by reference (path strings in DB)
- Old images should be copied to `uploads/products/` directory during migration

### Future Normalization Opportunities

1. **Categories Table**: Move from ptype string to a separate categories table
2. **Product Images Table**: Move from individual image columns to a images table
3. **Product Sizes Table**: Move from individual size columns to a sizes table
4. **Seller Association**: Add sellerId to products for multi-seller support
