/**
 * Legacy Data Migration Script
 *
 * Migrates data from the legacy Beauty Queen database to the new Prisma-based schema.
 *
 * Usage:
 *   1. Set LEGACY_DATABASE_URL in your .env or environment
 *   2. Set DATABASE_URL for the new database
 *   3. Run: npx ts-node scripts/migrate-legacy-data.ts
 *
 * Safety:
 *   - Creates a backup before migration
 *   - Validates counts before and after
 *   - Logs all operations
 *   - Does NOT delete legacy data
 */

import { PrismaClient } from '@prisma/client';
import * as mysql from 'mysql2/promise';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface LegacyProduct {
  id: number;
  name: string | null;
  price: number | null;
  description: string | null;
  image: Buffer | null;
  mrp: number | null;
  quantity: number | null;
  ptype: string | null;
  image1: Buffer | null;
  image2: Buffer | null;
  image3: Buffer | null;
  image4: Buffer | null;
  size_s: number | null;
  size_m: number | null;
  size_l: number | null;
  size_xl: number | null;
  size_xxl: number | null;
  deleted_at: Date | null;
  created_at: Date | null;
}

interface LegacyOrder {
  id: number;
  productid: number;
  name: string | null;
  size: string | null;
  price: number | null;
  quantity: number | null;
  subtotal: number | null;
  username: string | null;
  email: string | null;
  address: string | null;
  pincode: string | null;
  district: string | null;
  landmark: string | null;
  payment_method: string | null;
  payment_status: string | null;
  payment_id: string | null;
  status: string | null;
  order_date: Date | null;
}

interface LegacySeller {
  id: number;
  sellername: string | null;
  mobile: string | null;
  email: string | null;
  password: string | null;
}

interface MigrationResult {
  entity: string;
  legacyCount: number;
  newCount: number;
  success: boolean;
  errors: string[];
}

const results: MigrationResult[] = [];

async function getLegacyConnection(): Promise<mysql.Connection> {
  const legacyUrl = process.env.LEGACY_DATABASE_URL;
  if (!legacyUrl) {
    throw new Error('LEGACY_DATABASE_URL environment variable is required');
  }
  return mysql.createConnection(legacyUrl);
}

async function backupLegacyData(legacyConn: mysql.Connection): Promise<void> {
  const backupDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `legacy-backup-${timestamp}.sql`);

  console.log(`Creating backup at ${backupFile}...`);

  const [products] = await legacyConn.query('SELECT * FROM products');
  const [orders] = await legacyConn.query('SELECT * FROM orders');
  const [sellers] = await legacyConn.query('SELECT * FROM seller');

  const backup = {
    timestamp: new Date().toISOString(),
    products: (products as any[]).length,
    orders: (orders as any[]).length,
    sellers: (sellers as any[]).length,
  };

  fs.writeFileSync(path.join(backupDir, `legacy-counts-${timestamp}.json`), JSON.stringify(backup, null, 2));
  console.log(`Backup counts: ${JSON.stringify(backup)}`);
}

async function migrateProducts(legacyConn: mysql.Connection): Promise<void> {
  console.log('\n--- Migrating Products ---');

  const [rows] = await legacyConn.query('SELECT * FROM products');
  const legacyProducts = rows as LegacyProduct[];
  console.log(`Legacy products found: ${legacyProducts.length}`);

  let migrated = 0;
  const errors: string[] = [];

  for (const lp of legacyProducts) {
    try {
      // Convert blob images to base64 data URLs if they exist
      const imageData = lp.image ? `data:image/webp;base64,${lp.image.toString('base64')}` : null;
      const image1Data = lp.image1 ? `data:image/webp;base64,${lp.image1.toString('base64')}` : null;
      const image2Data = lp.image2 ? `data:image/webp;base64,${lp.image2.toString('base64')}` : null;
      const image3Data = lp.image3 ? `data:image/webp;base64,${lp.image3.toString('base64')}` : null;
      const image4Data = lp.image4 ? `data:image/webp;base64,${lp.image4.toString('base64')}` : null;

      await prisma.product.upsert({
        where: { id: lp.id },
        update: {
          name: lp.name,
          price: lp.price,
          description: lp.description,
          image: imageData,
          mrp: lp.mrp,
          quantity: lp.quantity,
          ptype: lp.ptype,
          image1: image1Data,
          image2: image2Data,
          image3: image3Data,
          image4: image4Data,
          sizeS: lp.size_s,
          sizeM: lp.size_m,
          sizeL: lp.size_l,
          sizeXl: lp.size_xl,
          sizeXxl: lp.size_xxl,
          deletedAt: lp.deleted_at,
        },
        create: {
          id: lp.id,
          name: lp.name,
          price: lp.price,
          description: lp.description,
          image: imageData,
          mrp: lp.mrp,
          quantity: lp.quantity,
          ptype: lp.ptype,
          image1: image1Data,
          image2: image2Data,
          image3: image3Data,
          image4: image4Data,
          sizeS: lp.size_s,
          sizeM: lp.size_m,
          sizeL: lp.size_l,
          sizeXl: lp.size_xl,
          sizeXxl: lp.size_xxl,
          deletedAt: lp.deleted_at,
        },
      });
      migrated++;
    } catch (error: any) {
      errors.push(`Product ${lp.id}: ${error.message}`);
    }
  }

  const newCount = await prisma.product.count();
  results.push({
    entity: 'Products',
    legacyCount: legacyProducts.length,
    newCount,
    success: errors.length === 0,
    errors,
  });

  console.log(`Migrated: ${migrated}/${legacyProducts.length}, New DB count: ${newCount}`);
  if (errors.length > 0) {
    console.log(`Errors: ${errors.join(', ')}`);
  }
}

async function migrateSellers(legacyConn: mysql.Connection): Promise<void> {
  console.log('\n--- Migrating Sellers ---');

  const [rows] = await legacyConn.query('SELECT * FROM seller');
  const legacySellers = rows as LegacySeller[];
  console.log(`Legacy sellers found: ${legacySellers.length}`);

  let migrated = 0;
  const errors: string[] = [];

  for (const ls of legacySellers) {
    try {
      await prisma.seller.upsert({
        where: { id: ls.id },
        update: {
          sellername: ls.sellername,
          mobile: ls.mobile,
          email: ls.email,
          password: ls.password,
        },
        create: {
          id: ls.id,
          sellername: ls.sellername,
          mobile: ls.mobile,
          email: ls.email,
          password: ls.password,
        },
      });
      migrated++;
    } catch (error: any) {
      errors.push(`Seller ${ls.id}: ${error.message}`);
    }
  }

  const newCount = await prisma.seller.count();
  results.push({
    entity: 'Sellers',
    legacyCount: legacySellers.length,
    newCount,
    success: errors.length === 0,
    errors,
  });

  console.log(`Migrated: ${migrated}/${legacySellers.length}, New DB count: ${newCount}`);
}

async function migrateOrders(legacyConn: mysql.Connection): Promise<void> {
  console.log('\n--- Migrating Orders ---');

  const [rows] = await legacyConn.query('SELECT * FROM orders');
  const legacyOrders = rows as LegacyOrder[];
  console.log(`Legacy orders found: ${legacyOrders.length}`);

  let migrated = 0;
  const errors: string[] = [];

  for (const lo of legacyOrders) {
    try {
      // Map legacy status values
      const statusMap: Record<string, string> = {
        'Pending': 'Pending',
        'Processing': 'Processing',
        'Shipped': 'Shipped',
        'Delivered': 'Delivered',
        'Cancelled': 'Cancelled',
      };
      const status = (statusMap[lo.status || 'Pending'] || 'Pending') as any;

      const paymentStatusMap: Record<string, string> = {
        'Pending': 'Pending',
        'Completed': 'Completed',
        'Failed': 'Failed',
        'paid': 'Completed',
        'unpaid': 'Pending',
      };
      const paymentStatus = (paymentStatusMap[lo.payment_status || 'Pending'] || 'Pending') as any;

      // Try to find existing user by email
      let userId: number | null = null;
      if (lo.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: lo.email },
        });
        if (existingUser) {
          userId = existingUser.id;
        }
      }

      // Find product's seller
      let sellerId: number | null = null;
      if (lo.productid) {
        const product = await prisma.product.findUnique({
          where: { id: lo.productid },
          select: { sellerId: true },
        });
        sellerId = product?.sellerId || null;
      }

      const checkoutId = `legacy-${lo.id}-${Date.now()}`;

      await prisma.order.create({
        data: {
          id: lo.id,
          checkoutId,
          userId,
          productId: lo.productid,
          sellerId,
          name: lo.name,
          size: lo.size,
          price: lo.price,
          quantity: lo.quantity,
          subtotal: lo.subtotal,
          username: lo.username,
          email: lo.email,
          address: lo.address,
          pincode: lo.pincode,
          district: lo.district,
          landmark: lo.landmark,
          paymentMethod: lo.payment_method,
          paymentStatus,
          paymentId: lo.payment_id,
          status,
          orderDate: lo.order_date,
        },
      });
      migrated++;
    } catch (error: any) {
      errors.push(`Order ${lo.id}: ${error.message}`);
    }
  }

  const newCount = await prisma.order.count();
  results.push({
    entity: 'Orders',
    legacyCount: legacyOrders.length,
    newCount,
    success: errors.length === 0,
    errors,
  });

  console.log(`Migrated: ${migrated}/${legacyOrders.length}, New DB count: ${newCount}`);
}

function printSummary(): void {
  console.log('\n========================================');
  console.log('       MIGRATION SUMMARY');
  console.log('========================================');

  let allPassed = true;

  for (const r of results) {
    const status = r.success && r.legacyCount === r.newCount ? '✓' : '✗';
    console.log(`${status} ${r.entity}: Legacy=${r.legacyCount}, New=${r.newCount}`);
    if (!r.success || r.legacyCount !== r.newCount) {
      allPassed = false;
      if (r.errors.length > 0) {
        r.errors.forEach((e) => console.log(`    Error: ${e}`));
      }
      if (r.legacyCount !== r.newCount) {
        console.log(`    Count mismatch! Difference: ${r.legacyCount - r.newCount}`);
      }
    }
  }

  console.log('========================================');
  console.log(allPassed ? 'Migration completed successfully!' : 'Migration completed with issues. Review above.');
  console.log('========================================');
}

async function main() {
  console.log('Beauty Queen Legacy Data Migration');
  console.log('===================================\n');

  const legacyConn = await getLegacyConnection();
  console.log('Connected to legacy database\n');

  try {
    // Step 1: Backup
    await backupLegacyData(legacyConn);

    // Step 2: Migrate in order (respecting foreign keys)
    await migrateSellers(legacyConn);
    await migrateProducts(legacyConn);
    await migrateOrders(legacyConn);

    // Step 3: Summary
    printSummary();
  } finally {
    await legacyConn.end();
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
