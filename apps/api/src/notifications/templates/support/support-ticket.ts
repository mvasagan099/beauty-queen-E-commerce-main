export function supportTicketTemplate(data: {
  username: string;
  ticketNumber: string;
  subject: string;
  status: string;
  message?: string;
  dashboardUrl?: string;
}): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #ec4899;">Support Ticket #${data.ticketNumber}</h2>
      <p>Dear ${data.username},</p>
      <p>Here is an update on your request:</p>
      <div style="background: #fdf2f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Ticket:</strong> #${data.ticketNumber}</p>
        <p style="margin: 5px 0;"><strong>Subject:</strong> ${data.subject}</p>
        <p style="margin: 5px 0;"><strong>Status:</strong> ${data.status}</p>
        ${data.message ? `<p style="margin: 10px 0 0 0; border-top: 1px solid #f3e8ff; padding-top: 10px;">${data.message}</p>` : ''}
      </div>
      ${data.dashboardUrl ? `<a href="${data.dashboardUrl}" style="background: #ec4899; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Ticket</a>` : ''}
      <p style="color: #999; font-size: 12px; margin-top: 30px;">Beauty Queen Support</p>
    </div>
  `;
}