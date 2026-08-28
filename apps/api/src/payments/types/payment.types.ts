export interface RazorpayOrderResponse {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  currency: string;
  receipt: string;
  status: string;
  created_at: number;
}

export interface CheckoutItem {
  productId: number;
  size: string;
  quantity: number;
  name: string;
  price: number;
}

export interface CalculatedCheckout {
  checkoutId: string;
  items: CheckoutItem[];
  subtotal: number;
  productDiscount: number;
  couponCode?: string;
  couponDiscount: number;
  shipping: number;
  tax: number;
  totalAmount: number;
  totalAmountPaise: number;
}

export interface RazorpayPaymentResponse {
  id: string;
  entity: string;
  order_id: string;
  status: string;
  amount: number;
  amount_locale?: string;
  amount_refunded?: number;
  currency: string;
  method: string;
  error_code?: string;
  error_description?: string;
  created_at: number;
}

export interface RazorpayWebhookEvent {
  event: string;
  contains: string[];
  payload?: {
    payment?: { entity?: RazorpayPaymentResponse };
    order?: { entity?: RazorpayOrderResponse };
    refund?: { entity?: any };
  };
}

export interface WebhookProcessResult {
  success: boolean;
  processed: boolean;
  status?: string;
  message?: string;
}

export interface PaymentVerifyResult {
  success: boolean;
  message: string;
  payment?: {
    id: number;
    checkoutId: string;
    status: string;
  };
  orders?: any[];
}

export interface PaymentCreateOrderResult {
  checkoutId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface PaymentRetryResult extends PaymentCreateOrderResult {
  attempt: number;
}

export interface PaymentStatusResult {
  id: number;
  checkoutId: string;
  status: string;
  amount: number;
  currency: string;
  method?: string | null;
  createdAt: Date;
  orders: {
    id: number;
    name: string;
    status: string;
    paymentStatus: string;
    subtotal: number;
  }[];
}
