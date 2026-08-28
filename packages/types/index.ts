export type Role = "CUSTOMER" | "SELLER" | "ADMIN";

export type OrderStatus =
  | "Pending"
  | "Confirmed"
  | "Processing"
  | "Shipped"
  | "Delivered"
  | "Cancelled"
  | "Refunded";

export type PaymentStatus = "Pending" | "Completed" | "Failed" | "Refunded";

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
  productId: number;
  name: string | null;
  size: string | null;
  price: number | string | null;
  quantity: number | null;
  subtotal: number | string | null;
  username: string | null;
  email: string | null;
  address: string | null;
  pincode: string | null;
  district: string | null;
  landmark: string | null;
  paymentMethod: string | null;
  paymentStatus: PaymentStatus;
  paymentId: string | null;
  status: OrderStatus;
  orderDate: string | null;
  image?: string | null;
  productName?: string | null;
  productPrice?: number | null;
}

export interface CartItem {
  id: number;
  name: string | null;
  price: number | null;
  image: string | null;
  size: string;
  quantity: number;
  total: number;
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
  role: Role;
  name: string | null;
}

export interface Review {
  id: number;
  userId: number;
  productId: number;
  rating: number;
  comment: string | null;
  createdAt: string;
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
}

export interface Coupon {
  id: number;
  code: string;
  discount: number;
  minPurchase: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  usedCount: number;
  expiresAt: string;
  active: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
