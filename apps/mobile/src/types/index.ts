export interface MobileUser {
  id: number;
  email: string;
  role: "CUSTOMER" | "SELLER" | "ADMIN";
  name: string | null;
}

export interface MobileProduct {
  id: number;
  name: string | null;
  price: number;
  mrp: number | null;
  description?: string | null;
  ptype: string | null;
  image: string | null;
  image1?: string | null;
  image2?: string | null;
  image3?: string | null;
  image4?: string | null;
  sizeS?: number | null;
  sizeM?: number | null;
  sizeL?: number | null;
  sizeXl?: number | null;
  sizeXxl?: number | null;
  quantity?: number | null;
}

export interface MobileCartItem {
  id?: number;
  productId: number;
  name: string;
  price: number;
  mrp?: number | null;
  image: string | null;
  size: string;
  quantity: number;
  subtotal?: number;
}

export interface ProductSwatch {
  id: string;
  name: string;
  hex: string;
  image?: string | null;
  inStock?: boolean;
}

export interface FlashSaleBanner {
  active: boolean;
  headline: string;
  subtext: string;
  couponCode: string;
  ctaLabel: string;
  ctaHref: string;
  endsAt: string | null;
}

export interface LoyaltySummary {
  tier: "Rose" | "Gold" | "Royal Zari";
  points: number;
  lifetimeSpend: number;
  nextTier: string | null;
  spendToNextTier: number;
  referralCode: string;
  referralsClaimed: number;
  appliedReferralCode: string | null;
}

export interface ShopTheLookBundle {
  id: string;
  title: string;
  occasion: string;
  description: string;
  discountPercent: number;
  originalTotal: number;
  bundlePrice: number;
  items: {
    productId: number;
    name: string;
    price: number;
    image: string | null;
    category: string;
    defaultSize: string;
  }[];
}

export interface MobileOrder {
  id: number;
  name: string | null;
  size: string | null;
  quantity: number;
  price: number;
  totalAmount?: number | null;
  subtotal?: number | null;
  status: string;
  paymentMethod: string | null;
  paymentStatus: string | null;
  orderDate: string;
  product?: { image?: string | null };
}
