export function otpTemplate(data: { otp: string }): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #ec4899;">Beauty Queen - Verification Code</h2>
      <p>Hello,</p>
      <p>Your verification code is:</p>
      <div style="background: #fdf2f8; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: bold; color: #ec4899; letter-spacing: 4px;">${data.otp}</span>
      </div>
      <p style="color: #666;">This code expires in 10 minutes.</p>
      <p style="color: #999; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
    </div>
  `;
}
