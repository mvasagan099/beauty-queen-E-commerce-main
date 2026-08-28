export function cartReminderTemplate(data: {
  username: string;
  items: Array<{ productName: string; image?: string | null; price: number; quantity: number; size?: string }>;
  total: number;
  cartUrl?: string;
  expiryHours?: number;
}): string {
  const itemsHtml = data.items
    .map(
      (item) => `
        <div style="display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f3e8ff;">
          ${item.image ? `<img src="${item.image}" alt="${item.productName}" width="60" style="border-radius: 6px; object-fit: cover;" />` : ''}
          <div>
            <p style="margin: 0;"><strong>${item.productName}</strong>${item.size ? ` <span style="color: #999;">(${item.size})</span>` : ''} × ${item.quantity}</p>
            <p style="margin: 2px 0 0 0; color: #ec4899;">₹${item.price}</p>
          </div>
        </div>
      `,
    )
    .join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #ec4899;">You left some favourites behind</h2>
      <p>Dear ${data.username},</p>
      <p>Your cart is waiting for you. ${data.expiryHours ? `Items held in your cart may be released after ${data.expiryHours} hours.` : 'Don\'t miss out!'}</p>
      <div style="background: #fdf2f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
        ${itemsHtml}
        <p style="margin: 15px 0 0 0; font-size: 18px;"><strong>Cart total: ₹${data.total}</strong></p>
      </div>
      ${data.cartUrl ? `<a href="${data.cartUrl}" style="background: #ec4899; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Go to my cart</a>` : ''}
      <p style="color: #999; font-size: 12px; margin-top: 30px;">You received this email because you opted in to promotional updates on Beauty Queen. You can change your preferences anytime from your account.</p>
    </div>
  `;
}