/**
 * Centralized payment statuses.
 *
 * The database `RazorpayPaymentStatus` enum is intentionally kept aligned with the
 * real Razorpay workflow (PENDING / AUTHORIZED / CAPTURED / FAILED / REFUNDED /
 * PARTIALLY_REFUNDED). Raw status strings must never be scattered through the
 * application - refer to these constants instead.
 */

export const PAYMENT_STATUS = {
  PENDING: 'PENDING' as const,
  AUTHORIZED: 'AUTHORIZED' as const,
  CAPTURED: 'CAPTURED' as const,
  FAILED: 'FAILED' as const,
  REFUNDED: 'REFUNDED' as const,
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED' as const,
};

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

/** Application payment methods. */
export const PAYMENT_METHOD = {
  COD: 'cod' as const,
  UPI: 'upi' as const,
  CARD: 'card' as const,
  NETBANKING: 'netbanking' as const,
  WALLET: 'wallet' as const,
  EMI: 'emi' as const,
};

export type PaymentMethod = (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];

/** The application currency. Razorpay amount is always quoted in this currency. */
export const PAYMENT_CURRENCY = 'INR';

/** Refund lifecycle statuses (matches RefundStatus enum). */
export const REFUND_STATUS = {
  PENDING: 'PENDING' as const,
  PROCESSING: 'PROCESSING' as const,
  COMPLETED: 'COMPLETED' as const,
  FAILED: 'FAILED' as const,
};

export type RefundStatus = (typeof REFUND_STATUS)[keyof typeof REFUND_STATUS];

/**
 * Mapping of raw Razorpay webhook/entity statuses onto internal payment states.
 * Razorpay statuses are lowercase; internal states are centralized here so the
 * meaning is agreed in exactly one place.
 */
export const RAZORPAY_STATUS_TO_INTERNAL: Record<string, PaymentStatus> = {
  created: PAYMENT_STATUS.PENDING,
  authorized: PAYMENT_STATUS.AUTHORIZED,
  captured: PAYMENT_STATUS.CAPTURED,
  failed: PAYMENT_STATUS.FAILED,
  refunded: PAYMENT_STATUS.REFUNDED,
  partially_refunded: PAYMENT_STATUS.PARTIALLY_REFUNDED,
  attempted: PAYMENT_STATUS.PENDING,
};

/** Order payment states (order.paymentStatus uses the PaymentStatus enum). */
export const ORDER_PAYMENT_STATUS = {
  PENDING: 'Pending' as const,
  COMPLETED: 'Completed' as const,
  FAILED: 'Failed' as const,
  REFUNDED: 'Refunded' as const,
};

/** Order states matching the OrderStatus enum. */
export const ORDER_STATUS = {
  PENDING: 'Pending' as const,
  CONFIRMED: 'Confirmed' as const,
  PROCESSING: 'Processing' as const,
  SHIPPED: 'Shipped' as const,
  DELIVERED: 'Delivered' as const,
  CANCELLED: 'Cancelled' as const,
  REFUNDED: 'Refunded' as const,
};

/** Redis keys used by the payments module. */
export const PAYMENT_REDIS_KEYS = {
  rateLimit: (userId: number, action: string) => `pay:rate:${userId}:${action}`,
  verifyLock: (paymentId: number) => `pay:verify-lock:${paymentId}`,
  webhookLock: (eventKey: string) => `pay:webhook-lock:${eventKey}`,
};

/** Default rate limits (attempts per window). */
export const PAYMENT_RATE_LIMITS = {
  createOrder: { max: 10, windowSeconds: 60 },
  verify: { max: 10, windowSeconds: 60 },
  retry: { max: 5, windowSeconds: 60 },
  refund: { max: 5, windowSeconds: 60 },
};