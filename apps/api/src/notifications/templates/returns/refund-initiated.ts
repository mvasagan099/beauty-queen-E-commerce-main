export function refundInitiatedTemplate(data: {
  orderId: number;
  username: string;
  amount: number;
}): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #ec4899;">Refund Initiated</h2>
      <p>Dear ${data.username},</p>
      <p>Your refund has been initiated.</p>
      <div style="background: #fdf2f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Order ID:</strong> #${data.orderId}</p>
        <p><strong>Refund Amount:</strong> ₹${data.amount}</p>
      </div>
      <p style="color: #666;">The refund will be credited to your original payment method within 5-7 business days.</p>
      <p style="color: #999; font-size: 12px;">Beauty Queen E-commerce</p>
    </div>
  `;
}
