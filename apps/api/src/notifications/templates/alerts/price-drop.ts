export function priceDropTemplate(data: {
  username: string;
  productName: string;
  image?: string | null;
  watchedPrice: number;
  currentPrice: number;
  oldPrice?: number | null;
  productUrl?: string;
}): string {
  const savings = Math.max(0, data.watchedPrice - data.currentPrice);
  const savingsInfo =
    savings > 0
      ? `<p style="margin: 5px 0; color: #22c55e;"><strong>You save ₹${savings}</strong> vs. the price you were tracking (₹${data.watchedPrice}).</p>`
      : '';

  const image = data.image
    ? `<img src="${data.image}" alt="${data.productName}" style="max-width: 100%; border-radius: 8px; height: auto; margin: 10px 0;" />`
    : '';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #ec4899;">Price Drop Alert</h2>
      <p>Dear ${data.username},</p>
      <p>The item you're tracking just dropped in price:</p>
      <div style="background: #fdf2f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
        ${image}
        <p style="margin: 10px 0 0 0; font-size: 18px;"><strong>${data.productName}</strong></p>
        <p style="margin: 5px 0; font-size: 22px; color: #16a34a;"><strong>Current price: ₹${data.currentPrice}</strong></p>
        ${data.oldPrice != null ? `<p style="margin: 0; color: #999; text-decoration: line-through;">Was: ₹${data.oldPrice}</p>` : ''}
        ${savingsInfo}
      </div>
      ${data.productUrl ? `<a href="${data.productUrl}" style="background: #ec4899; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Product</a>` : ''}
      <p style="color: #999; font-size: 12px; margin-top: 30px;">You received this email because you subscribed to price-drop alerts on Beauty Queen.</p>
    </div>
  `;
}