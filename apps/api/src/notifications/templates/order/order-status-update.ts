export function orderStatusUpdateTemplate(data: {
  orderId: number;
  username: string;
  productName: string;
  oldStatus: string;
  newStatus: string;
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
}): string {
  const statusMessages: Record<string, string> = {
    Confirmed: 'Your order has been confirmed and is being prepared.',
    Processing: 'Your order is now being processed.',
    Shipped: 'Great news! Your order has been shipped.',
    Delivered: 'Your order has been delivered successfully!',
    Cancelled: 'Your order has been cancelled.',
  };

  const statusMessage = statusMessages[data.newStatus] || `Order status updated to ${data.newStatus}.`;

  let trackingInfo = '';
  if (data.carrier && data.trackingNumber) {
    trackingInfo = `
      <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #22c55e;">
        <p style="margin: 0;"><strong>Carrier:</strong> ${data.carrier}</p>
        <p style="margin: 5px 0 0 0;"><strong>Tracking Number:</strong> ${data.trackingNumber}</p>
        ${data.trackingUrl ? `<p style="margin: 5px 0 0 0;"><a href="${data.trackingUrl}" style="color: #ec4899;">Track your order</a></p>` : ''}
      </div>
    `;
  }

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #ec4899;">Order Status Update</h2>
      <p>Dear ${data.username},</p>
      <p>${statusMessage}</p>
      <div style="background: #fdf2f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Order ID:</strong> #${data.orderId}</p>
        <p><strong>Product:</strong> ${data.productName}</p>
        <p><strong>Previous Status:</strong> ${data.oldStatus}</p>
        <p><strong>New Status:</strong> ${data.newStatus}</p>
      </div>
      ${trackingInfo}
      <p style="color: #999; font-size: 12px;">Beauty Queen E-commerce</p>
    </div>
  `;
}
