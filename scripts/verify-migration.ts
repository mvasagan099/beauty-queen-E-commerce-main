/**
 * Migration Verification Script
 *
 * Verifies data integrity after legacy data migration.
 * Compares counts and performs spot-checks on randomly selected records.
 *
 * Usage:
 *   1. Set LEGACY_DATABASE_URL and DATABASE_URL
 *   2. Run: npx ts-node scripts/verify-migration.ts
 */

import { PrismaClient } from '@prisma/client';
import * as mysql from 'mysql2/promise';

const prisma = new PrismaClient();

interface VerificationResult {
  entity: string;
  legacyCount: number;
  newCount: number;
  match: boolean;
  spotChecks: SpotCheck[];
}

interface SpotCheck {
  id: number;
  field: string;
  legacyValue: any;
  newValue: any;
  match: boolean;
}

async function getLegacyConnection(): Promise<mysql.Connection> {
  const legacyUrl = process.env.LEGACY_DATABASE_URL;
  if (!legacyUrl) {
    throw new Error('LEGACY_DATABASE_URL environment variable is required');
  }
  return mysql.createConnection(legacyUrl);
}

async function verifyProducts(legacyConn: mysql.Connection): Promise<VerificationResult> {
  console.log('\n--- Verifying Products ---');

  const [legacyRows] = await legacyConn.query('SELECT COUNT(*) as count FROM products');
  const legacyCount = (legacyRows as any[])[0].count;
  const newCount = await prisma.product.count();

  console.log(`Legacy: ${legacyCount}, New: ${newCount}`);

  const spotChecks: SpotCheck[] = [];

  // Spot check random products
  const [legacyProducts] = await legacyConn.query(
    'SELECT id, name, price, mrp, ptype FROM products ORDER BY RAND() LIMIT 5'
  );

  for (const lp of legacyProducts as any[]) {
    const newProduct = await prisma.product.findUnique({
      where: { id: lp.id },
      select: { id: true, name: true, price: true, mrp: true, ptype: true },
    });

    if (newProduct) {
      const fields = ['name', 'price', 'mrp', 'ptype'] as const;
      for (const field of fields) {
        const match = String(lp[field]) === String(newProduct[field]);
        spotChecks.push({
          id: lp.id,
          field,
          legacyValue: lp[field],
          newValue: newProduct[field],
          match,
        });
        if (!match) {
          console.log(`  MISMATCH Product ${lp.id}.${field}: legacy=${lp[field]}, new=${newProduct[field]}`);
        }
      }
    } else {
      console.log(`  MISSING Product ${lp.id} not found in new database`);
    }
  }

  return {
    entity: 'Products',
    legacyCount,
    newCount,
    match: legacyCount === newCount,
    spotChecks,
  };
}

async function verifySellers(legacyConn: mysql.Connection): Promise<VerificationResult> {
  console.log('\n--- Verifying Sellers ---');

  const [legacyRows] = await legacyConn.query('SELECT COUNT(*) as count FROM seller');
  const legacyCount = (legacyRows as any[])[0].count;
  const newCount = await prisma.seller.count();

  console.log(`Legacy: ${legacyCount}, New: ${newCount}`);

  const spotChecks: SpotCheck[] = [];

  const [legacySellers] = await legacyConn.query(
    'SELECT id, sellername, mobile, email FROM seller ORDER BY id LIMIT 3'
  );

  for (const ls of legacySellers as any[]) {
    const newSeller = await prisma.seller.findUnique({
      where: { id: ls.id },
      select: { id: true, sellername: true, mobile: true, email: true },
    });

    if (newSeller) {
      const fields = ['sellername', 'mobile', 'email'] as const;
      for (const field of fields) {
        const match = String(ls[field]) === String(newSeller[field]);
        spotChecks.push({
          id: ls.id,
          field,
          legacyValue: ls[field],
          newValue: newSeller[field],
          match,
        });
      }
    } else {
      console.log(`  MISSING Seller ${ls.id}`);
    }
  }

  return {
    entity: 'Sellers',
    legacyCount,
    newCount,
    match: legacyCount === newCount,
    spotChecks,
  };
}

async function verifyOrders(legacyConn: mysql.Connection): Promise<VerificationResult> {
  console.log('\n--- Verifying Orders ---');

  const [legacyRows] = await legacyConn.query('SELECT COUNT(*) as count FROM orders');
  const legacyCount = (legacyRows as any[])[0].count;
  const newCount = await prisma.order.count();

  console.log(`Legacy: ${legacyCount}, New: ${newCount}`);

  const spotChecks: SpotCheck[] = [];

  const [legacyOrders] = await legacyConn.query(
    'SELECT id, productid, name, size, price, quantity, subtotal, username, email, status FROM orders ORDER BY RAND() LIMIT 5'
  );

  for (const lo of legacyOrders as any[]) {
    const newOrder = await prisma.order.findUnique({
      where: { id: lo.id },
      select: {
        id: true, productId: true, name: true, size: true,
        price: true, quantity: true, subtotal: true,
        username: true, email: true, status: true,
      },
    });

    if (newOrder) {
      const fields = ['name', 'size', 'price', 'quantity', 'subtotal', 'username', 'email', 'status'] as const;
      for (const field of fields) {
        const match = String(lo[field]) === String(newOrder[field]);
        spotChecks.push({
          id: lo.id,
          field,
          legacyValue: lo[field],
          newValue: newOrder[field],
          match,
        });
        if (!match) {
          console.log(`  MISMATCH Order ${lo.id}.${field}: legacy=${lo[field]}, new=${newOrder[field]}`);
        }
      }
    } else {
      console.log(`  MISSING Order ${lo.id}`);
    }
  }

  return {
    entity: 'Orders',
    legacyCount,
    newCount,
    match: legacyCount === newCount,
    spotChecks,
  };
}

function printVerificationSummary(results: VerificationResult[]): void {
  console.log('\n========================================');
  console.log('      VERIFICATION SUMMARY');
  console.log('========================================');

  let allPassed = true;

  for (const r of results) {
    const countStatus = r.match ? '✓' : '✗';
    const failedChecks = r.spotChecks.filter((c) => !c.match).length;
    const spotStatus = failedChecks === 0 ? '✓' : '✗';

    console.log(`${countStatus} ${r.entity}: Legacy=${r.legacyCount}, New=${r.newCount}`);
    console.log(`  Spot checks: ${r.spotChecks.length} checked, ${failedChecks} mismatches ${spotStatus}`);

    if (!r.match || failedChecks > 0) {
      allPassed = false;
    }
  }

  console.log('========================================');
  console.log(allPassed ? 'All verifications passed!' : 'Some verifications failed. Review above.');
  console.log('========================================');
}

async function main() {
  console.log('Beauty Queen Migration Verification');
  console.log('====================================\n');

  const legacyConn = await getLegacyConnection();
  console.log('Connected to legacy database\n');

  try {
    const results = await Promise.all([
      verifyProducts(legacyConn),
      verifySellers(legacyConn),
      verifyOrders(legacyConn),
    ]);

    printVerificationSummary(results);
  } finally {
    await legacyConn.end();
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Verification failed:', error);
  process.exit(1);
});
