export interface OrderFilters {
  status?: string;
  search?: string;
  paymentStatus?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface OrderWithProduct {
  id: number;
  checkoutId: string | null;
  userId: number | null;
  productId: number;
  name: string | null;
  size: string | null;
  price: any;
  quantity: number | null;
  subtotal: any;
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
  shippedAt: Date | null;
  deliveredAt: Date | null;
  orderDate: Date | null;
  product: {
    id: number;
    name: string | null;
    price: number | null;
    image: string | null;
  };
  statusHistory?: any[];
}
