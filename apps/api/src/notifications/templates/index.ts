import { EmailEventType } from '../types/notification.types';
import { otpTemplate } from './otp/otp';
import { orderCreatedTemplate } from './order/order-created';
import { orderStatusUpdateTemplate } from './order/order-status-update';
import { orderCancelledTemplate } from './order/order-cancelled';
import { paymentSuccessTemplate } from './payment/payment-success';
import { paymentFailedTemplate } from './payment/payment-failed';
import { shippingUpdateTemplate } from './shipping/shipping-update';
import { returnRequestedTemplate } from './returns/return-requested';
import { returnApprovedTemplate } from './returns/return-approved';
import { returnRejectedTemplate } from './returns/return-rejected';
import { refundInitiatedTemplate } from './returns/refund-initiated';
import { refundCompletedTemplate } from './returns/refund-completed';
import { backInStockTemplate } from './alerts/back-in-stock';
import { priceDropTemplate } from './alerts/price-drop';
import { cartReminderTemplate } from './cart/cart-reminder';
import { supportTicketTemplate } from './support/support-ticket';

type TemplateFn = (data: Record<string, any>) => string;
type SubjectFn = (data: Record<string, any>) => string;

interface TemplateEntry {
  subject: string | SubjectFn;
  template: TemplateFn;
}

const templateMap: Record<EmailEventType, TemplateEntry> = {
  [EmailEventType.OTP_REQUESTED]: {
    subject: 'Your Beauty Queen Verification Code',
    template: otpTemplate,
  },
  [EmailEventType.ORDER_CREATED]: {
    subject: (data: any) => `Order Confirmed #${data.orderId} - Beauty Queen`,
    template: orderCreatedTemplate,
  },
  [EmailEventType.PAYMENT_SUCCESS]: {
    subject: (data: any) => `Payment Confirmed - Order #${data.orderId}`,
    template: paymentSuccessTemplate,
  },
  [EmailEventType.PAYMENT_FAILED]: {
    subject: (data: any) => `Payment Failed - Order #${data.orderId}`,
    template: paymentFailedTemplate,
  },
  [EmailEventType.ORDER_CONFIRMED]: {
    subject: (data: any) => `Order #${data.orderId} Confirmed - Beauty Queen`,
    template: orderCreatedTemplate,
  },
  [EmailEventType.ORDER_PROCESSING]: {
    subject: (data: any) => `Order #${data.orderId} Processing - Beauty Queen`,
    template: orderStatusUpdateTemplate,
  },
  [EmailEventType.ORDER_SHIPPED]: {
    subject: (data: any) => `Order #${data.orderId} Shipped - Beauty Queen`,
    template: shippingUpdateTemplate,
  },
  [EmailEventType.ORDER_DELIVERED]: {
    subject: (data: any) => `Order #${data.orderId} Delivered - Beauty Queen`,
    template: orderStatusUpdateTemplate,
  },
  [EmailEventType.ORDER_CANCELLED]: {
    subject: (data: any) => `Order #${data.orderId} Cancelled - Beauty Queen`,
    template: orderCancelledTemplate,
  },
  [EmailEventType.RETURN_REQUESTED]: {
    subject: (data: any) => `Return Request - Order #${data.orderId}`,
    template: returnRequestedTemplate,
  },
  [EmailEventType.RETURN_APPROVED]: {
    subject: (data: any) => `Return Approved - Order #${data.orderId}`,
    template: returnApprovedTemplate,
  },
  [EmailEventType.RETURN_REJECTED]: {
    subject: (data: any) => `Return Rejected - Order #${data.orderId}`,
    template: returnRejectedTemplate,
  },
  [EmailEventType.REFUND_INITIATED]: {
    subject: (data: any) => `Refund Initiated - Order #${data.orderId}`,
    template: refundInitiatedTemplate,
  },
  [EmailEventType.REFUND_COMPLETED]: {
    subject: (data: any) => `Refund Completed - Order #${data.orderId}`,
    template: refundCompletedTemplate,
  },
  [EmailEventType.BACK_IN_STOCK]: {
    subject: (data: any) => `Back in stock: ${data.productName}`,
    template: backInStockTemplate,
  },
  [EmailEventType.PRICE_DROP]: {
    subject: (data: any) => `Price drop: ${data.productName} is now ₹${data.currentPrice}`,
    template: priceDropTemplate,
  },
  [EmailEventType.CART_REMINDER]: {
    subject: 'Don\'t forget your cart - Beauty Queen',
    template: cartReminderTemplate,
  },
  [EmailEventType.SUPPORT_TICKET_CREATED]: {
    subject: (data: any) => `Support request received #${data.ticketNumber}`,
    template: supportTicketTemplate,
  },
  [EmailEventType.SUPPORT_TICKET_REPLIED]: {
    subject: (data: any) => `New reply on #${data.ticketNumber} - Beauty Queen Support`,
    template: supportTicketTemplate,
  },
  [EmailEventType.SUPPORT_TICKET_RESOLVED]: {
    subject: (data: any) => `Your ticket #${data.ticketNumber} has been resolved`,
    template: supportTicketTemplate,
  },
  [EmailEventType.SUPPORT_TICKET_CLOSED]: {
    subject: (data: any) => `Your ticket #${data.ticketNumber} has been closed`,
    template: supportTicketTemplate,
  },
};

export function getEmailSubject(eventType: EmailEventType, data: Record<string, any>): string {
  const entry = templateMap[eventType];
  if (!entry) return 'Notification from Beauty Queen';
  return typeof entry.subject === 'function' ? entry.subject(data) : entry.subject;
}

export function renderEmailTemplate(eventType: EmailEventType, data: Record<string, any>): string {
  const entry = templateMap[eventType];
  if (!entry) {
    return `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <p>You have a notification from Beauty Queen.</p>
    </div>`;
  }
  return entry.template(data);
}
