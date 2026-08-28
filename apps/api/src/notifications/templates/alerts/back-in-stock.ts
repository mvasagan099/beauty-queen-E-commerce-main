export function backInStockTemplate(data: {
  username: string;
  productName: string;
  image?: string | null;
  size?: string | null;
  price?: number | null;
  productUrl?: string;
}): string {
  const sizeInfo = data.size
    ? `<p><strong>Requested Size:</strong> ${data.size}</p>`
    : '';
  const image = data.image
    ? `<img src="${data.image}" alt="${data.productName}" style="max-width: 100%; border-radius: 8px; height: auto; margin: 10px 0;" />`
    : '';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #ec4899;">Back in Stock!</h2>
      <p>Dear ${data.username},</p>
      <p>Good news — the item you were waiting for is back in stock:</p>
      <div style="background: #fdf2f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
        ${image}
        <p style="margin: 10px 0 0 0; font-size: 18px;"><strong>${data.productName}</strong></p>
        ${sizeInfo}
        ${data.price != null ? `<p style="margin: 5px 0;"><strong>Price:</strong> ₹${data.price}</p>` : ''}
      </div>
      ${data.productUrl ? `<a href="${data.productUrl}" style="background: #ec4899; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Shop Now</a>` : ''}
      <p style="color: #999; font-size: 12px; margin-top: 30px;">You received this email because you subscribed to back-in-stock alerts on Beauty Queen.</p>
    </div>
  `;
}