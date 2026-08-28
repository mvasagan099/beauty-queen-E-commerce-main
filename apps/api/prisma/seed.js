const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Seed products across all categories
  const products = [
    // Sarees
    { name: 'Banarasi Silk Saree', price: 1299, mrp: 2499, description: 'Elegant Banarasi silk saree with intricate gold zari work. Perfect for weddings and festive occasions.', ptype: 'saree', sizeS: 10, sizeM: 15, sizeL: 20, sizeXl: 5, sizeXxl: 3 },
    { name: 'Kanjivaram Pure Silk Saree', price: 2499, mrp: 4999, description: 'Authentic Kanjivaram pure silk saree with traditional temple border design.', ptype: 'saree', sizeS: 8, sizeM: 12, sizeL: 15, sizeXl: 4, sizeXxl: 2 },
    { name: 'Chanderi Cotton Saree', price: 899, mrp: 1599, description: 'Lightweight Chanderi cotton saree with delicate block prints.', ptype: 'saree', sizeS: 15, sizeM: 20, sizeL: 25, sizeXl: 8, sizeXxl: 5 },
    { name: 'Patola Silk Saree', price: 3499, mrp: 6999, description: 'Double ikat Patola silk saree with geometric patterns. Handwoven masterpiece.', ptype: 'saree', sizeS: 5, sizeM: 8, sizeL: 10, sizeXl: 3, sizeXxl: 1 },
    { name: 'Mysore Crepe Silk Saree', price: 1599, mrp: 2999, description: 'Soft Mysore crepe silk saree with golden border. Easy to drape and maintain.', ptype: 'saree', sizeS: 12, sizeM: 18, sizeL: 22, sizeXl: 7, sizeXxl: 4 },
    { name: 'Tussar Silk Saree', price: 1899, mrp: 3499, description: 'Natural Tussar silk saree with hand-painted Madhubani art motifs.', ptype: 'saree', sizeS: 7, sizeM: 10, sizeL: 14, sizeXl: 5, sizeXxl: 3 },

    // Kurthis
    { name: 'Anarkali Floor Length Kurthi', price: 999, mrp: 1899, description: 'Beautiful Anarkali floor length kurthi with churidar sleeves and mirror work.', ptype: 'kurthi', sizeS: 15, sizeM: 20, sizeL: 18, sizeXl: 10, sizeXxl: 6 },
    { name: 'A-Line Cotton Kurthi', price: 599, mrp: 1099, description: 'Comfortable A-line cotton kurthi perfect for daily wear. Breathable fabric.', ptype: 'kurthi', sizeS: 20, sizeM: 25, sizeL: 22, sizeXl: 12, sizeXxl: 8 },
    { name: 'Designer Georgette Kurthi', price: 1299, mrp: 2499, description: 'Designer georgette kurthi with heavy embroidered neckline and 3/4th sleeves.', ptype: 'kurthi', sizeS: 10, sizeM: 15, sizeL: 12, sizeXl: 6, sizeXxl: 4 },
    { name: 'Rayon Flared Kurthi', price: 799, mrp: 1499, description: 'Flared rayon kurthi with digital print. Perfect for casual outings.', ptype: 'kurthi', sizeS: 18, sizeM: 22, sizeL: 20, sizeXl: 8, sizeXxl: 5 },
    { name: 'Shirt Style Kurthi', price: 699, mrp: 1299, description: 'Modern shirt style kurthi with button-down front. Fusion wear at its best.', ptype: 'kurthi', sizeS: 12, sizeM: 16, sizeL: 14, sizeXl: 9, sizeXxl: 5 },

    // Tops
    { name: 'Crop Top with Palazzo Set', price: 899, mrp: 1699, description: 'Trendy crop top paired with flared palazzo pants. Party wear ensemble.', ptype: 'top', sizeS: 14, sizeM: 18, sizeL: 16, sizeXl: 8, sizeXxl: 5 },
    { name: 'Peplum Top', price: 599, mrp: 1099, description: 'Stylish peplum top with ruffled hem. Flattering for all body types.', ptype: 'top', sizeS: 16, sizeM: 20, sizeL: 18, sizeXl: 10, sizeXxl: 6 },
    { name: 'Off-Shoulder Blouse', price: 499, mrp: 899, description: 'Trendy off-shoulder blouse with elastic neckline. Perfect for pairing with sarees.', ptype: 'top', sizeS: 12, sizeM: 15, sizeL: 14, sizeXl: 8, sizeXxl: 4 },
    { name: 'Denim Jacket Top', price: 999, mrp: 1899, description: 'Classic denim jacket style top with contrast stitching. Wardrobe essential.', ptype: 'top', sizeS: 10, sizeM: 14, sizeL: 16, sizeXl: 7, sizeXxl: 3 },
    { name: 'Cold Shoulder Kurti Top', price: 749, mrp: 1399, description: 'Elegant cold shoulder kurti top with thread work on sleeves.', ptype: 'top', sizeS: 11, sizeM: 16, sizeL: 15, sizeXl: 9, sizeXxl: 5 },

    // Leggings
    { name: 'Cotton Churidar Legging', price: 299, mrp: 599, description: 'Soft cotton churidar legging with elastic waist. Available in multiple colors.', ptype: 'leggin', sizeS: 20, sizeM: 25, sizeL: 30, sizeXl: 15, sizeXxl: 10 },
    { name: 'Jeggings - Skinny Fit', price: 399, mrp: 799, description: 'Stretchable jeggings with jeans-like appearance. Comfortable all-day wear.', ptype: 'leggin', sizeS: 18, sizeM: 22, sizeL: 28, sizeXl: 12, sizeXxl: 8 },
    { name: 'Parallel Pants', price: 449, mrp: 899, description: 'Wide-leg parallel pants with pockets. Contemporary style meets comfort.', ptype: 'leggin', sizeS: 15, sizeM: 20, sizeL: 25, sizeXl: 10, sizeXxl: 6 },
    { name: 'Palazzo Pants', price: 399, mrp: 749, description: 'Flowy palazzo pants with high waist. Perfect for pairing with kurtis.', ptype: 'leggin', sizeS: 20, sizeM: 25, sizeL: 22, sizeXl: 12, sizeXxl: 7 },
    { name: 'Cotton Legging 3-Pack', price: 699, mrp: 1299, description: 'Value pack of 3 cotton leggings in black, navy, and maroon.', ptype: 'leggin', sizeS: 25, sizeM: 30, sizeL: 28, sizeXl: 15, sizeXxl: 10 },

    // Cosmetics
    { name: 'Rose Glow Foundation', price: 599, mrp: 999, description: 'Lightweight foundation with rose extract. Provides medium to full coverage with natural finish.', ptype: 'cosmetics', sizeS: 30, sizeM: 30, sizeL: 30, sizeXl: 30, sizeXxl: 30 },
    { name: 'Matte Lipstick Set - 6 Shades', price: 799, mrp: 1499, description: 'Set of 6 long-lasting matte lipsticks in trending shades. Hydrating formula.', ptype: 'cosmetics', sizeS: 25, sizeM: 25, sizeL: 25, sizeXl: 25, sizeXxl: 25 },
    { name: 'Kajal & Eyeliner Duo', price: 299, mrp: 549, description: 'Smudge-proof kajal and eyeliner combo. Waterproof and long-lasting 12hr formula.', ptype: 'cosmetics', sizeS: 40, sizeM: 40, sizeL: 40, sizeXl: 40, sizeXxl: 40 },
    { name: 'Complete Makeup Kit', price: 1999, mrp: 3999, description: 'All-in-one makeup kit with foundation, concealer, powder, blush, eyeshadow palette, and brushes.', ptype: 'cosmetics', sizeS: 15, sizeM: 15, sizeL: 15, sizeXl: 15, sizeXxl: 15 },
    { name: 'Natural Hair Oil - 200ml', price: 349, mrp: 649, description: '100% natural hair oil with coconut, amla, and jojoba extracts. Promotes healthy hair growth.', ptype: 'cosmetics', sizeS: 50, sizeM: 50, sizeL: 50, sizeXl: 50, sizeXxl: 50 },
  ];

  const createdProducts = [];
  for (const p of products) {
    const product = await prisma.product.create({
      data: p,
    });
    createdProducts.push(product);
    console.log(`  Created product: ${product.name}`);
  }

  // Seed seller account (password: seller123)
  const hashedPassword = await bcrypt.hash('seller123', 10);
  const seller = await prisma.seller.create({
    data: {
      sellername: 'Beauty Queen Store',
      mobile: '9876543210',
      email: 'seller@beautyqueen.com',
      password: hashedPassword,
    },
  });
  console.log(`  Created seller: ${seller.sellername}`);

  // Seed sample orders
  const sampleOrders = [
    {
      productId: createdProducts[0].id,
      name: 'Banarasi Silk Saree',
      size: 'M',
      price: 1299,
      quantity: 1,
      subtotal: 1299,
      username: 'Priya Sharma',
      email: 'priya@example.com',
      address: '123 MG Road, Bangalore',
      pincode: '560001',
      district: 'Bangalore Urban',
      landmark: 'Near MG Metro',
      paymentMethod: 'cod',
      paymentStatus: 'Completed',
      status: 'Delivered',
    },
    {
      productId: createdProducts[6].id,
      name: 'Anarkali Floor Length Kurthi',
      size: 'L',
      price: 999,
      quantity: 2,
      subtotal: 1998,
      username: 'Neha Gupta',
      email: 'neha@example.com',
      address: '456 Anna Salai, Chennai',
      pincode: '600002',
      district: 'Chennai',
      landmark: 'Opposite T Nagar',
      paymentMethod: 'online',
      paymentStatus: 'Completed',
      status: 'Shipped',
      paymentId: 'pay_Razorpay123',
    },
    {
      productId: createdProducts[15].id,
      name: 'Crop Top with Palazzo Set',
      size: 'S',
      price: 899,
      quantity: 1,
      username: 'Anita Reddy',
      email: 'anita@example.com',
      address: '789 Jubilee Hills, Hyderabad',
      pincode: '500033',
      district: 'Hyderabad',
      landmark: 'Near KBR Park',
      paymentMethod: 'online',
      paymentStatus: 'Completed',
      status: 'Processing',
      paymentId: 'pay_Razorpay456',
    },
  ];

  for (const o of sampleOrders) {
    const { subtitle, ...orderData } = o;
    const order = await prisma.order.create({ data: orderData });
    console.log(`  Created order #${order.id} for ${o.username}`);

    // Add status history
    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        oldStatus: null,
        newStatus: o.status,
      },
    });
  }

  // Seed a coupon
  await prisma.coupon.create({
    data: {
      code: 'BEAUTY100',
      discount: 100,
      minPurchase: 500,
      maxDiscount: 100,
      usageLimit: 50,
      usedCount: 5,
      expiresAt: new Date('2026-12-31'),
      active: true,
    },
  });
  console.log('  Created coupon: BEAUTY100');

  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
