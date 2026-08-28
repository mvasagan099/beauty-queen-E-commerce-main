export interface PricingItem {
  productId: number;
  size: string;
  quantity: number;
}

export interface EnrichedPricingItem extends PricingItem {
  name: string;
  unitPrice: number;
  mrp: number;
}

export interface CouponResult {
  code: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discount: number;
  calculatedDiscount: number;
}

export interface ShippingResult {
  charge: number;
  freeShipping: boolean;
  rule?: string;
}

export interface TaxResult {
  rate: number;
  amount: number;
  type: string;
}

export interface PricingBreakdown {
  items: Array<EnrichedPricingItem & { lineTotal: number; lineDiscount: number }>;
  subtotal: number;
  productDiscount: number;
  couponDiscount: number;
  shipping: number;
  tax: number;
  total: number;
}

export interface PricingContext {
  items: PricingItem[];
  couponCode?: string;
  userId?: number;
  pincode?: string;
  district?: string;
}
