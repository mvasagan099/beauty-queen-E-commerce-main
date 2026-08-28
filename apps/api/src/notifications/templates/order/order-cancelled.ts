export function orderCancelledTemplate(data: {
  orderId: number;
  username: string;
  productName: string;
  reason?: string;
}): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #ec4899;">Order Cancelled</h2>
      <p>Dear ${data.username},</p>
      <p>Your order has been cancelled.</p>
      <div style="background: #fdf2f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Order ID:</strong> #${data.orderId}</p>
        <p><strong>Product:</strong> ${data.productName}</p>
        ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
      </div>
      <p style="color: #666;">If you have any questions, please contact our support team.</p>
      <p style="color: #999; font-size: 12px;">Beauty Queen E-commerce</p>
    </div>
  `;
}
