export function shippingUpdateTemplate(data: {
  orderId: number;
  username: string;
  productName: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string;
}): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #ec4899;">Your Order Has Been Shipped!</h2>
      <p>Dear ${data.username},</p>
      <p>Great news! Your order has been shipped and is on its way to you.</p>
      <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
        <p><strong>Order ID:</strong> #${data.orderId}</p>
        <p><strong>Product:</strong> ${data.productName}</p>
        <p><strong>Carrier:</strong> ${data.carrier}</p>
        <p><strong>Tracking Number:</strong> ${data.trackingNumber}</p>
        ${data.trackingUrl ? `<p><a href="${data.trackingUrl}" style="color: #ec4899; text-decoration: underline;">Track your order</a></p>` : ''}
      </div>
      <p style="color: #999; font-size: 12px;">Beauty Queen E-commerce</p>
    </div>
  `;
}
