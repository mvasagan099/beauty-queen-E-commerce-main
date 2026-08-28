export function orderCreatedTemplate(data: {
  orderId: number;
  username: string;
  productName: string;
  price: number;
  quantity: number;
  total: number;
  paymentMethod: string;
}): string {
  const paymentLabel = data.paymentMethod === 'cod' ? 'Cash on Delivery' : 'UPI';
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #ec4899;">Order Confirmed!</h2>
      <p>Dear ${data.username},</p>
      <p>Thank you for your order. Here are the details:</p>
      <div style="background: #fdf2f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Order ID:</strong> #${data.orderId}</p>
        <p><strong>Product:</strong> ${data.productName}</p>
        <p><strong>Quantity:</strong> ${data.quantity}</p>
        <p><strong>Price:</strong> ₹${data.price}</p>
        <p><strong>Total:</strong> ₹${data.total}</p>
        <p><strong>Payment Method:</strong> ${paymentLabel}</p>
      </div>
      <p style="color: #666;">We'll notify you when your order is shipped.</p>
      <p style="color: #999; font-size: 12px;">Beauty Queen E-commerce</p>
    </div>
  `;
}
