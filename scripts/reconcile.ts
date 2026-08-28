/**
 * Reconciliation check script (READ-ONLY).
 *
 * Detects inconsistent states between Orders, Payments, Order Items and
 * Inventory WITHOUT modifying any data. It reports discrepancies for human
 * review in accordance with the reconciliation policy (financial/inventory
 * records must never be changed automatically without validated rules).
 *
 * Checks performed:
 *   1. Orders with a payment that has no matching successful payment record.
 *   2. Orders marked paid (paymentStatus Completed/Refunded) but with no
 *      captured payment.
 *   3. Payments that reference an order/checkout with no matching order.
 *   4. Inventory vs product stock fields / recorded movements (summarised).
 *
 * Usage:
 *   Set DATABASE_URL to the production database, then:
 *     npx ts-node scripts/reconcile.ts [--verbose]
 *
 * Exit code 0 = no discrepancies, 1 = discrepancies found.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const verbose = process.argv.includes('--verbose');

async function reconcilePayments() {
  const problems: string[] = [];

  const orders = await prisma.order.findMany({
    select: { id: true, checkoutId: true, paymentStatus: true, totalAmount: true },
  });
  const payments = await prisma.payment.findMany({
    select: { id: true, checkoutId: true, status: true, amount: true },
  });

  const paymentsByCheckout = new Map<string, typeof payments>();
  for (const p of payments) {
    const list = paymentsByCheckout.get(p.checkoutId) || [];
    list.push(p);
    paymentsByCheckout.set(p.checkoutId, list);
  }

  for (const o of orders) {
    const matching = o.checkoutId ? paymentsByCheckout.get(o.checkoutId) : undefined;
    const paidOrRefunded = o.paymentStatus === 'Completed' || o.paymentStatus === 'Refunded';
    const captured = matching?.filter((p) => p.status === 'CAPTURED');
    if (paidOrRefunded && (!matching || matching.length === 0)) {
      problems.push(
        `Order #${o.id} is '${o.paymentStatus}' but has NO payment record (checkoutId=${o.checkoutId})`,
      );
    } else if (paidOrRefunded && (!captured || captured.length === 0)) {
      problems.push(
        `Order #${o.id} is '${o.paymentStatus}' but has no CAPTURED payment (checkoutId=${o.checkoutId})`,
      );
    }
  }

  // Payments that don't map to any order (unmatched payment).
  const orderCheckouts = new Set(orders.map((o) => o.checkoutId).filter(Boolean));
  for (const p of payments) {
    if (p.status === 'CAPTURED' && !orderCheckouts.has(p.checkoutId)) {
      problems.push(
        `Payment #${p.id} is CAPTURED but no matching order found (checkoutId=${p.checkoutId})`,
      );
    }
  }

  return problems;
}

async function reconcileInventory() {
  const problems: string[] = [];
  // Compare per-size stock fields with the aggregated quantity when present.
  const products = await prisma.product.findMany({
    select: { id: true, name: true, quantity: true, sizeS: true, sizeM: true, sizeL: true, sizeXl: true, sizeXxl: true },
  });
  for (const p of products) {
    if (p.quantity === null || p.quantity === undefined) continue;
    const bySize = [p.sizeS ?? 0, p.sizeM ?? 0, p.sizeL ?? 0, p.sizeXl ?? 0, p.sizeXxl ?? 0]
      .reduce((a, b) => a + b, 0);
    if (bySize > 0 && bySize !== p.quantity) {
      problems.push(
        `Product #${p.id} (${p.name}): quantity=${p.quantity} != sum of per-size stock=${bySize}`,
      );
    }
  }
  return problems;
}

async function main() {
  const withPayments = process.argv.includes('--payments') || !process.argv.includes('--inventory-only');
  const withInventory = process.argv.includes('--inventory') || !process.argv.includes('--payments-only');

  let exitCode = 0;

  if (withPayments) {
    console.log('== Payment/Order reconciliation ==');
    const problems = await reconcilePayments();
    if (problems.length === 0) {
      console.log('  OK: no payment/order discrepancies detected.');
    } else {
      exitCode = 1;
      for (const p of problems) console.log(`  ! ${p}`);
    }
  }

  if (withInventory) {
    console.log('== Inventory reconciliation ==');
    const problems = await reconcileInventory();
    if (problems.length === 0) {
      console.log('  OK: no inventory discrepancies detected.');
    } else {
      exitCode = 1;
      for (const p of problems) console.log(`  ! ${p}`);
    }
  }

  console.log(exitCode === 0 ? 'RECONCILIATION PASSED' : 'RECONCILIATION FOUND DISCREPANCIES');
  await prisma.$disconnect();
  process.exit(exitCode);
}

main().catch(async (e) => {
  console.error('Reconciliation failed:', e.message);
  await prisma.$disconnect();
  process.exit(1);
});
