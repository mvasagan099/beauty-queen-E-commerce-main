export function paymentFailedTemplate(data: {
  orderId: number;
  username: string;
  amount: number;
  reason?: string;
}): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #ec4899;">Payment Failed</h2>
      <p>Dear ${data.username},</p>
      <p>Unfortunately, your payment could not be processed.</p>
      <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
        <p><strong>Order ID:</strong> #${data.orderId}</p>
        <p><strong>Amount:</strong> ₹${data.amount}</p>
        ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
      </div>
      <p style="color: #666;">Please try again or use a different payment method.</p>
      <p style="color: #999; font-size: 12px;">Beauty Queen E-commerce</p>
    </div>
  `;
}
