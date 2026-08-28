export function returnApprovedTemplate(data: {
  orderId: number;
  username: string;
  productName: string;
}): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #ec4899;">Return Approved</h2>
      <p>Dear ${data.username},</p>
      <p>Your return request has been approved.</p>
      <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
        <p><strong>Order ID:</strong> #${data.orderId}</p>
        <p><strong>Product:</strong> ${data.productName}</p>
      </div>
      <p style="color: #666;">Please follow the return instructions provided. Your refund will be processed once we receive the item.</p>
      <p style="color: #999; font-size: 12px;">Beauty Queen E-commerce</p>
    </div>
  `;
}
