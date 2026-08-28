const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface ApiOptions extends RequestInit {
  json?: any;
}

export function getSellerToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("seller_access_token");
}

export function setSellerToken(token: string) {
  localStorage.setItem("seller_access_token", token);
}

export function clearSellerToken() {
  localStorage.removeItem("seller_access_token");
  localStorage.removeItem("seller_refresh_token");
  localStorage.removeItem("seller_info");
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T = any>(
    endpoint: string,
    options: ApiOptions = {}
  ): Promise<T> {
    const { json, ...fetchOptions } = options;
    const method = (fetchOptions.method || "GET").toUpperCase();

    const headers: Record<string, string> = {
      ...(fetchOptions.headers as Record<string, string>),
    };

    if (json) {
      headers["Content-Type"] = "application/json";
      fetchOptions.body = JSON.stringify(json);
    }

    const sellerToken = getSellerToken();
    if (sellerToken && !endpoint.startsWith("/sellers/login") && !endpoint.startsWith("/sellers/signup")) {
      headers["Authorization"] = `Bearer ${sellerToken}`;
    }

    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      credentials: "include",
      ...fetchOptions,
      headers,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: "Request failed" }));
      throw new Error(error.message || `HTTP ${res.status}`);
    }

    return res.json();
  }

  get<T = any>(endpoint: string, options?: ApiOptions) {
    return this.request<T>(endpoint, { method: "GET", ...options });
  }

  post<T = any>(endpoint: string, json?: any, options?: ApiOptions) {
    return this.request<T>(endpoint, { method: "POST", json, ...options });
  }

  put<T = any>(endpoint: string, json?: any, options?: ApiOptions) {
    return this.request<T>(endpoint, { method: "PUT", json, ...options });
  }

  patch<T = any>(endpoint: string, json?: any, options?: ApiOptions) {
    return this.request<T>(endpoint, { method: "PATCH", json, ...options });
  }

  delete<T = any>(endpoint: string, options?: ApiOptions) {
    return this.request<T>(endpoint, { method: "DELETE", ...options });
  }

  async upload<T = any>(
    endpoint: string,
    formData: FormData,
    options?: ApiOptions
  ): Promise<T> {
    const headers: Record<string, string> = {};
    const sellerToken = getSellerToken();
    if (sellerToken) {
      headers["Authorization"] = `Bearer ${sellerToken}`;
    }

    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "POST",
      body: formData,
      credentials: "include",
      ...options,
      headers,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: "Upload failed" }));
      throw new Error(error.message || `HTTP ${res.status}`);
    }

    return res.json();
  }

  async uploadPatch<T = any>(
    endpoint: string,
    formData: FormData,
    options?: ApiOptions
  ): Promise<T> {
    const headers: Record<string, string> = {};
    const sellerToken = getSellerToken();
    if (sellerToken) {
      headers["Authorization"] = `Bearer ${sellerToken}`;
    }

    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "PATCH",
      body: formData,
      credentials: "include",
      ...options,
      headers,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: "Upload failed" }));
      throw new Error(error.message || `HTTP ${res.status}`);
    }

    return res.json();
  }
}

export const api = new ApiClient(API_URL);

export const authApi = {
  sendOtp: (email: string) =>
    api.post("/auth/send-otp", { email }),
  verifyOtp: (email: string, otp: string) =>
    api.post("/auth/verify-otp", { email, otp }),
  refresh: (refreshToken: string) =>
    api.post("/auth/refresh", { refreshToken }),
  logout: () => api.post("/auth/logout"),
  me: () => api.get("/auth/me"),
};

export const productsApi = {
  list: (params?: {
    category?: string;
    sort?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set("category", params.category);
    if (params?.sort) searchParams.set("sort", params.sort);
    if (params?.search) searchParams.set("search", params.search);
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.offset) searchParams.set("offset", String(params.offset));
    const qs = searchParams.toString();
    return api.get(`/products${qs ? `?${qs}` : ""}`);
  },
  get: (id: number) => api.get(`/products/${id}`),
  homepage: () => api.get("/products/homepage"),
  search: (q: string) =>
    api.get(`/products/search?q=${encodeURIComponent(q)}`),
  create: (formData: FormData) => api.upload("/products", formData),
  update: (id: number, data: FormData | Record<string, unknown>) => {
    if (data instanceof FormData) {
      return api.uploadPatch(`/products/${id}`, data);
    }
    return api.patch(`/products/${id}`, data);
  },
  delete: (id: number) => api.delete(`/products/${id}`),
  restore: (id: number) => api.post(`/products/${id}/restore`),
  adminAll: () => api.get("/products/admin/all"),
};

export const cartApi = {
  get: () => api.get("/cart"),
  add: (productId: number, size: string, quantity: number) =>
    api.post("/cart", { productId, size, quantity }),
  update: (itemId: number, quantity: number) =>
    api.put(`/cart/${itemId}`, { quantity }),
  remove: (itemId: number) =>
    api.delete(`/cart/${itemId}`),
  clear: () => api.delete("/cart"),
};

export const checkoutApi = {
  buyNow: (data: {
    productId: number;
    size: string;
    quantity: number;
    address: {
      name: string;
      email: string;
      phone: string;
      address: string;
      pincode: string;
      district: string;
      landmark?: string;
    };
    paymentMethod: string;
    paymentId?: string;
  }) => api.post("/checkout/buynow", data),
  cartBuyNow: (data: {
    address: {
      name: string;
      email: string;
      phone: string;
      address: string;
      pincode: string;
      district: string;
      landmark?: string;
    };
    paymentMethod: string;
    paymentId?: string;
  }) => api.post("/checkout/cartbuynow", data),
};

export const paymentsApi = {
  createCheckout: (data: {
    source: "cart" | "buynow";
    buynowItem?: { productId: number; size: string; quantity: number };
    couponCode?: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    pincode: string;
    district: string;
    landmark?: string;
    paymentMethod: "cod" | "upi";
  }) => api.post("/payments/checkout", data),
  createOrder: (checkoutId: string) =>
    api.post("/payments/create-order", { checkoutId }),
  verify: (data: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) => api.post("/payments/verify", data),
  confirmCod: (checkoutId: string) =>
    api.post("/payments/cod/confirm", { checkoutId }),
  retry: (checkoutId: string) =>
    api.post("/payments/retry", { checkoutId }),
  getStatus: (id: number) => api.get(`/payments/${id}/status`),
  byCheckout: (checkoutId: string) =>
    api.get(`/payments/checkout/${checkoutId}/status`),
  refund: (paymentId: number, data: { amount: number; reason?: string }) =>
    api.post(`/payments/${paymentId}/refund`, data),
};

export const ordersApi = {
  list: (params?: { page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const qs = searchParams.toString();
    return api.get(`/orders${qs ? `?${qs}` : ""}`);
  },
  all: (params?: { status?: string; search?: string; page?: number; limit?: number; paymentStatus?: string; dateFrom?: string; dateTo?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.search) searchParams.set("search", params.search);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.paymentStatus) searchParams.set("paymentStatus", params.paymentStatus);
    if (params?.dateFrom) searchParams.set("dateFrom", params.dateFrom);
    if (params?.dateTo) searchParams.set("dateTo", params.dateTo);
    const qs = searchParams.toString();
    return api.get(`/orders/all${qs ? `?${qs}` : ""}`);
  },
  get: (id: number) => api.get(`/orders/${id}`),
  cancel: (id: number, reason?: string) => api.post(`/orders/${id}/cancel`, { reason }),
  tracking: (id: number) => api.get(`/orders/${id}/tracking`),
  invoice: (id: number) => api.get(`/orders/${id}/invoice`),
  updateStatus: (id: number, status: string, note?: string) =>
    api.patch(`/orders/${id}/status`, { status, note }),
  delete: (id: number) => api.delete(`/orders/${id}`),
  history: (id: number) => api.get(`/orders/${id}/history`),
  dashboard: () => api.get("/orders/dashboard"),
};

export const sellerOrdersApi = {
  list: (params?: { status?: string; search?: string; page?: number; limit?: number; paymentStatus?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.search) searchParams.set("search", params.search);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.paymentStatus) searchParams.set("paymentStatus", params.paymentStatus);
    const qs = searchParams.toString();
    return api.get(`/seller/orders${qs ? `?${qs}` : ""}`);
  },
  get: (id: number) => api.get(`/seller/orders/${id}`),
  updateStatus: (id: number, status: string, note?: string) =>
    api.patch(`/seller/orders/${id}/status`, { status, note }),
};

export const adminOrdersApi = {
  list: (params?: { status?: string; search?: string; page?: number; limit?: number; paymentStatus?: string; dateFrom?: string; dateTo?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.search) searchParams.set("search", params.search);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.paymentStatus) searchParams.set("paymentStatus", params.paymentStatus);
    if (params?.dateFrom) searchParams.set("dateFrom", params.dateFrom);
    if (params?.dateTo) searchParams.set("dateTo", params.dateTo);
    const qs = searchParams.toString();
    return api.get(`/admin/orders${qs ? `?${qs}` : ""}`);
  },
  get: (id: number) => api.get(`/admin/orders/${id}`),
  updateStatus: (id: number, status: string, note?: string) =>
    api.patch(`/admin/orders/${id}/status`, { status, note }),
  history: (id: number) => api.get(`/admin/orders/${id}/history`),
  dashboard: () => api.get("/orders/dashboard"),
};

export const sellersApi = {
  signup: (data: any) => api.post("/sellers/signup", data),
  login: async (mobile: string, password: string) => {
    const result = await api.post("/sellers/login", { mobile, password });
    if (result.accessToken) {
      setSellerToken(result.accessToken);
      localStorage.setItem("seller_refresh_token", result.refreshToken);
      localStorage.setItem("seller_info", JSON.stringify(result.seller));
    }
    return result;
  },
  logout: async () => {
    try {
      await api.post("/sellers/logout");
    } finally {
      clearSellerToken();
    }
  },
  me: () => api.get("/sellers/me"),
  profile: () => api.get("/sellers/profile"),
  updateProfile: (data: any) => api.put("/sellers/profile", data),
};

export const sellerApi = {
  dashboard: () => api.get("/sellers/dashboard"),
  inventory: () => api.get("/sellers/inventory"),
  products: (params?: { page?: number; limit?: number; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.search) searchParams.set("search", params.search);
    const qs = searchParams.toString();
    return api.get(`/sellers/products${qs ? `?${qs}` : ""}`);
  },
  product: (id: number) => api.get(`/sellers/products/${id}`),
  orders: (params?: { status?: string; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.search) searchParams.set("search", params.search);
    const qs = searchParams.toString();
    return api.get(`/sellers/orders${qs ? `?${qs}` : ""}`);
  },
  order: (id: number) => api.get(`/sellers/orders/${id}`),
  updateOrderStatus: (id: number, status: string) =>
    api.put(`/sellers/orders/${id}/status`, { status }),
};

export const adminApi = {
  dashboard: () => api.get("/admin/dashboard"),
  sellers: () => api.get("/admin/sellers"),
  seller: (id: number) => api.get(`/admin/sellers/${id}`),
  updateSellerStatus: (id: number, isActive: boolean) =>
    api.put(`/admin/sellers/${id}/status`, { isActive }),
  updateSellerRole: (id: number, role: string) =>
    api.put(`/admin/sellers/${id}/role`, { role }),
  products: (params?: { page?: number; limit?: number; search?: string; category?: string; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.search) searchParams.set("search", params.search);
    if (params?.category) searchParams.set("category", params.category);
    if (params?.status) searchParams.set("status", params.status);
    const qs = searchParams.toString();
    return api.get(`/admin/products${qs ? `?${qs}` : ""}`);
  },
  orders: (params?: { status?: string; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.search) searchParams.set("search", params.search);
    const qs = searchParams.toString();
    return api.get(`/admin/orders${qs ? `?${qs}` : ""}`);
  },
  users: () => api.get("/admin/users"),
  user: (id: number) => api.get(`/admin/users/${id}`),
  updateUserRole: (id: number, role: string) =>
    api.put(`/admin/users/${id}/role`, { role }),
  auditLogs: (params?: {
    action?: string;
    entityType?: string;
    actorRole?: string;
    page?: number;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.action) searchParams.set("action", params.action);
    if (params?.entityType) searchParams.set("entityType", params.entityType);
    if (params?.actorRole) searchParams.set("actorRole", params.actorRole);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const qs = searchParams.toString();
    return api.get(`/admin/audit-logs${qs ? `?${qs}` : ""}`);
  },
};

export const analyticsApi = {
  adminOverview: (range?: string, from?: string, to?: string) => {
    const qs = buildAnalyticsQuery(range, from, to);
    return api.get(`/admin/analytics/overview${qs}`);
  },
  adminSales: (range?: string, from?: string, to?: string) => {
    const qs = buildAnalyticsQuery(range, from, to);
    return api.get(`/admin/analytics/sales${qs}`);
  },
  adminOrders: (range?: string, from?: string, to?: string) => {
    const qs = buildAnalyticsQuery(range, from, to);
    return api.get(`/admin/analytics/orders${qs}`);
  },
  adminProducts: (range?: string, from?: string, to?: string) => {
    const qs = buildAnalyticsQuery(range, from, to);
    return api.get(`/admin/analytics/products${qs}`);
  },
  lowStockThreshold: () => api.get("/admin/analytics/low-stock-threshold"),
  updateLowStockThreshold: (threshold: number) =>
    api.put("/admin/analytics/low-stock-threshold", { threshold }),
  sellerOverview: (range?: string, from?: string, to?: string) => {
    const qs = buildAnalyticsQuery(range, from, to);
    return api.get(`/seller/analytics/overview${qs}`);
  },
};

function buildAnalyticsQuery(range?: string, from?: string, to?: string): string {
  const params = new URLSearchParams();
  if (range) params.set("range", range);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const s = params.toString();
  return s ? `?${s}` : "";
}

export const inventoryApi = {
  getStock: (productId: number) => api.get(`/inventory/${productId}`),
  updateStock: (productId: number, size: string, quantity: number) =>
    api.put(`/inventory/${productId}`, { size, quantity }),
};

export const wishlistApi = {
  list: () => api.get("/wishlist"),
  toggle: (productId: number) =>
    api.post("/wishlist/toggle", { productId }),
  moveToCart: (productId: number) =>
    api.post(`/wishlist/${productId}/move-to-cart`),
  clear: () => api.delete("/wishlist"),
};

export const usersApi = {
  me: () => api.get("/users/me"),
  updateProfile: (data: { name?: string; phone?: string; email?: string }) =>
    api.patch("/users/me", data),
  getAddresses: () => api.get("/users/addresses"),
  getAddress: (id: number) => api.get(`/users/addresses/${id}`),
  createAddress: (data: any) => api.post("/users/addresses", data),
  updateAddress: (id: number, data: any) => api.patch(`/users/addresses/${id}`, data),
  setDefaultAddress: (id: number) => api.patch(`/users/addresses/${id}/default`),
  deleteAddress: (id: number) => api.delete(`/users/addresses/${id}`),
};

export const reviewsApi = {
  getByProduct: (productId: number) =>
    api.get(`/reviews/product/${productId}`),
  getMyReviews: () => api.get("/reviews/my"),
  canReview: (productId: number) =>
    api.get(`/reviews/product/${productId}/can-review`),
  create: (data: { productId: number; rating: number; comment?: string; title?: string }) =>
    api.post("/reviews", data),
  update: (id: number, data: { rating?: number; comment?: string; title?: string }) =>
    api.patch(`/reviews/${id}`, data),
  delete: (id: number) => api.delete(`/reviews/${id}`),
  moderate: (id: number, status: string) =>
    api.patch(`/reviews/${id}/moderate`, { status }),
};

export const couponsApi = {
  validate: (code: string, amount: number) =>
    api.post("/coupons/validate", { code, amount }),
  apply: (code: string) => api.post("/coupons/apply", { code }),
  remove: (code: string) => api.post("/coupons/remove", { code }),
};

export const returnsApi = {
  create: (data: { orderId: number; reason: string; note?: string }) =>
    api.post("/returns", data),
  list: () => api.get("/returns"),
  get: (id: number) => api.get(`/returns/${id}`),
};

export const refundsApi = {
  list: () => api.get("/refunds"),
  get: (id: number) => api.get(`/refunds/${id}`),
};

export const invoicesApi = {
  mine: () => api.get("/invoices/mine"),
  byOrder: (orderId: number) => api.get(`/invoices/order/${orderId}`),
  adminAll: () => api.get("/invoices/admin"),
};

export const adminReturnsApi = {
  list: (params?: { status?: string; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.search) searchParams.set("search", params.search);
    const qs = searchParams.toString();
    return api.get(`/admin/returns${qs ? `?${qs}` : ""}`);
  },
  get: (id: number) => api.get(`/admin/returns/${id}`),
  updateStatus: (id: number, status: string, note?: string) =>
    api.patch(`/admin/returns/${id}/status`, { status, note }),
};

export const shippingApi = {
  calculate: (subtotal: number, pincode?: string) =>
    api.post("/shipping/calculate", { subtotal, pincode }),
};

export const notificationsApi = {
  list: (page?: number, limit?: number) => {
    const params = new URLSearchParams();
    if (page) params.set("page", page.toString());
    if (limit) params.set("limit", limit.toString());
    const qs = params.toString();
    return api.get(`/notifications${qs ? `?${qs}` : ""}`);
  },
  unreadCount: () => api.get("/notifications/unread-count"),
  markAsRead: (id: number) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch("/notifications/read-all"),
  getPreferences: () => api.get("/notifications/preferences"),
  updatePreferences: (data: { orderUpdates?: boolean; paymentUpdates?: boolean; promotional?: boolean }) =>
    api.put("/notifications/preferences", data),
};

export const searchApi = {
  suggestions: (q: string, limit?: number) => {
    const params = new URLSearchParams({ q });
    if (limit) params.set("limit", String(limit));
    return api.get(`/search/suggestions?${params.toString()}`);
  },
  popular: (limit?: number, days?: number) => {
    const params = new URLSearchParams();
    if (limit) params.set("limit", String(limit));
    if (days) params.set("days", String(days));
    const qs = params.toString();
    return api.get(`/search/popular${qs ? `?${qs}` : ""}`);
  },
};

export const alertsApi = {
  list: () => api.get("/alerts"),
  createStockAlert: (productId: number, size?: string) =>
    api.post(`/products/${productId}/stock-alert`, size ? { size } : {}),
  getStockAlert: (productId: number) => api.get(`/products/${productId}/stock-alert`),
  cancelStockAlert: (productId: number) => api.delete(`/products/${productId}/stock-alert`),
  createPriceAlert: (productId: number, watchedPrice: number) =>
    api.post(`/wishlist/${productId}/price-alert`, { watchedPrice }),
  cancelPriceAlert: (productId: number) => api.delete(`/wishlist/${productId}/price-alert`),
};

export const supportApi = {
  createTicket: (data: { subject: string; body: string; orderId?: number }) =>
    api.post("/support/tickets", data),
  list: (params?: { page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const qs = searchParams.toString();
    return api.get(`/support/tickets${qs ? `?${qs}` : ""}`);
  },
  get: (id: number) => api.get(`/support/tickets/${id}`),
  reply: (id: number, body: string) =>
    api.post(`/support/tickets/${id}/messages`, { body }),
  close: (id: number) => api.patch(`/support/tickets/${id}/close`),
  adminList: (params?: { status?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const qs = searchParams.toString();
    return api.get(`/admin/support/tickets${qs ? `?${qs}` : ""}`);
  },
  adminGet: (id: number) => api.get(`/admin/support/tickets/${id}`),
  adminReply: (id: number, body: string, isInternal?: boolean) =>
    api.post(`/admin/support/tickets/${id}/messages`, { body, isInternal }),
  adminUpdateStatus: (id: number, data: { status?: string; priority?: string }) =>
    api.patch(`/admin/support/tickets/${id}/status`, data),
};

const EXPORT_RESOURCES = ["orders", "products", "customers", "refunds", "sales"] as const;
export type ExportResource = (typeof EXPORT_RESOURCES)[number];

/** Download an admin CSV export as a file (auth flows through cookies/JWT). */
export async function downloadExport(resource: ExportResource) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
  const res = await fetch(`${API_URL}/admin/exports/${resource}`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Export failed (HTTP ${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${resource}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
