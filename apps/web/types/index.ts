export interface Product {
  id: number;
  name: string | null;
  price: number | null;
  description: string | null;
  image: string | null;
  mrp: number | null;
  quantity: number | null;
  ptype: string | null;
  image1: string | null;
  image2: string | null;
  image3: string | null;
  image4: string | null;
  sizeS: number | null;
  sizeM: number | null;
  sizeL: number | null;
  sizeXl: number | null;
  sizeXxl: number | null;
  sellerId: number | null;
  deletedAt: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface Order {
  id: number;
  checkoutId: string | null;
  userId: number | null;
  productId: number;
  sellerId?: number | null;
  name: string | null;
  size: string | null;
  price: number | string | null;
  quantity: number | null;
  subtotal: number | string | null;
  discountAmount: number | string | null;
  couponCode: string | null;
  couponDiscount: number | string | null;
  shippingAmount: number | string | null;
  taxAmount: number | string | null;
  totalAmount: number | string | null;
  username: string | null;
  email: string | null;
  address: string | null;
  pincode: string | null;
  district: string | null;
  landmark: string | null;
  paymentMethod: string | null;
  paymentStatus: string;
  paymentId: string | null;
  status: string;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippingStatus: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  orderDate: string | null;
  image?: string | null;
  productName?: string | null;
  productPrice?: number | null;
  product?: {
    id: number;
    name: string | null;
    price: number | null;
    image: string | null;
    image1?: string | null;
    image2?: string | null;
    description?: string | null;
    ptype?: string | null;
  };
  statusHistory?: OrderStatusHistory[];
}

export interface OrderStatusHistory {
  id: number;
  orderId: number;
  oldStatus: string | null;
  newStatus: string;
  note?: string | null;
  changedAt: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CartItem {
  id: number;
  productId: number;
  name: string;
  price: number;
  mrp: number | null;
  image: string | null;
  size: string;
  quantity: number;
  subtotal: number;
}

export interface CartResponse {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
}

export interface BuyNowItem {
  productId: number;
  name: string;
  size: string;
  quantity: number;
  price: number;
  mrp: number | null;
  image: string | null;
  subtotal: number;
}

export interface HomepageData {
  newArrival: Product[];
  saree: Product[];
  kurthi: Product[];
  top: Product[];
  leggin: Product[];
  cosmetics: Product[];
  randomProducts: Product[];
  highPrice: Product[];
  lowPrice: Product[];
}

export interface SellerDashboard {
  totalProducts: number;
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  recentOrders: Order[];
  ordersByStatus: { status: string; count: number }[];
}

export interface User {
  id: number;
  email: string;
  role: "CUSTOMER" | "SELLER" | "ADMIN";
  name: string | null;
  phone?: string | null;
  createdAt?: string;
}

export interface Address {
  id: number;
  userId: number;
  name: string;
  phone: string;
  address: string;
  pincode: string;
  district: string;
  landmark: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Review {
  id: number;
  userId: number;
  productId: number;
  rating: number;
  title: string | null;
  comment: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  isVerifiedPurchase?: boolean;
  createdAt: string;
  updatedAt?: string;
  user?: { id: number; name: string | null; email: string };
  product?: { id: number; name: string | null; image: string | null; price: number | null };
}

export interface WishlistItem {
  id: number;
  userId: number;
  productId: number;
  createdAt: string;
  product: Product;
}

export interface ReviewSummary {
  avgRating: number;
  totalReviews: number;
}

export interface OrderDashboard {
  totalOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
}

export interface ReturnRequest {
  id: number;
  orderId: number;
  userId: number;
  reason: string;
  status: string;
  note: string | null;
  requestedAt: string;
  approvedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  refunds: Refund[];
  order?: { id: number; productId: number; name: string | null; size: string | null; product?: { name: string | null; image: string | null } };
  user?: { id: number; name: string | null; email: string };
}

export interface Refund {
  id: number;
  returnRequestId: number | null;
  checkoutId: string;
  userId: number;
  amount: number;
  status: string;
  providerRefundId: string | null;
  failureReason: string | null;
  createdAt: string;
  user?: { id: number; name: string | null; email: string };
}

export interface CouponData {
  id: number;
  code: string;
  type: string;
  discount: number;
  minPurchase: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  usedCount: number;
  perUserLimit: number | null;
  startsAt: string | null;
  expiresAt: string;
  active: boolean;
  createdAt: string;
}

export interface SellerDashboardStats {
  totalProducts: number;
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  recentOrders: Order[];
  ordersByStatus: { status: string; count: number }[];
}

export interface NotificationItem {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  data: Record<string, any> | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  success: boolean;
  notifications: NotificationItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface NotificationPreference {
  id: number;
  userId: number;
  orderUpdates: boolean;
  paymentUpdates: boolean;
  promotional: boolean;
}
