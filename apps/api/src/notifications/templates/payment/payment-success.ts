export function paymentSuccessTemplate(data: {
  orderId: number;
  username: string;
  amount: number;
  paymentMethod: string;
}): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #ec4899;">Payment Successful!</h2>
      <p>Dear ${data.username},</p>
      <p>Your payment has been processed successfully.</p>
      <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
        <p><strong>Order ID:</strong> #${data.orderId}</p>
        <p><strong>Amount Paid:</strong> ₹${data.amount}</p>
        <p><strong>Payment Method:</strong> ${data.paymentMethod === 'cod' ? 'Cash on Delivery' : 'UPI'}</p>
      </div>
      <p style="color: #666;">We'll start processing your order shortly.</p>
      <p style="color: #999; font-size: 12px;">Beauty Queen E-commerce</p>
    </div>
  `;
}
