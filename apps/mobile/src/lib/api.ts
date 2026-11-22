import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const DEFAULT_API =
  Platform.OS === "android"
    ? "http://10.0.2.2:5000/api"
    : "http://localhost:5000/api";

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL || DEFAULT_API
).replace(/\/+$/, "");

const API_ORIGIN = API_BASE_URL.replace(/\/api$/, "");

const ACCESS_TOKEN_KEY = "bq_access_token";
const REFRESH_TOKEN_KEY = "bq_refresh_token";

export function resolveImageUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/")) return `${API_ORIGIN}${path}`;
  return `${API_ORIGIN}/uploads/${path}`;
}

export async function saveAuthTokens(accessToken?: string, refreshToken?: string) {
  if (accessToken) {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken).catch(() => undefined);
  }
  if (refreshToken) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken).catch(() => undefined);
  }
}

export async function clearAuthTokens() {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY).catch(() => undefined);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => undefined);
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY).catch(() => null);
}

async function tryRefreshToken(): Promise<string | null> {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY).catch(() => null);
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-platform": "mobile",
      },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.accessToken) {
      await saveAuthTokens(data.accessToken, data.refreshToken);
      return data.accessToken as string;
    }
  } catch {
    // ignore refresh failure
  }
  return null;
}

async function request<T = any>(
  endpoint: string,
  options: { method?: string; json?: unknown; retryAuth?: boolean } = {}
): Promise<T> {
  const { method = "GET", json, retryAuth = true } = options;
  const token = await getAccessToken();

  const headers: Record<string, string> = {
    "x-client-platform": "mobile",
  };
  if (json !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: json !== undefined ? JSON.stringify(json) : undefined,
  });

  if (res.status === 401 && retryAuth) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      return request<T>(endpoint, { method, json, retryAuth: false });
    }
  }

  const payload = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
  if (!res.ok) {
    throw new Error(payload?.message || `Request failed (${res.status})`);
  }
  return payload as T;
}

export const mobileApi = {
  get: <T = any>(endpoint: string) => request<T>(endpoint, { method: "GET" }),
  post: <T = any>(endpoint: string, json?: unknown) =>
    request<T>(endpoint, { method: "POST", json }),
  put: <T = any>(endpoint: string, json?: unknown) =>
    request<T>(endpoint, { method: "PUT", json }),
  delete: <T = any>(endpoint: string, json?: unknown) =>
    request<T>(endpoint, { method: "DELETE", json }),
};

export const authApi = {
  sendOtp: (email: string) => mobileApi.post("/auth/send-otp", { email }),
  verifyOtp: (email: string, otp: string) =>
    mobileApi.post<{
      success: boolean;
      user: { id: number; email: string; role: "CUSTOMER" | "SELLER" | "ADMIN"; name: string | null };
      accessToken?: string;
      refreshToken?: string;
    }>("/auth/verify-otp", { email, otp }),
  me: () => mobileApi.get("/auth/me"),
  logout: () => mobileApi.post("/auth/logout"),
};

export const productsApi = {
  homepage: () => mobileApi.get("/products/homepage"),
  list: (params?: {
    category?: string;
    search?: string;
    size?: string;
    sort?: string;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.category) q.set("category", params.category);
    if (params?.search) q.set("search", params.search);
    if (params?.size) q.set("size", params.size);
    if (params?.sort) q.set("sort", params.sort);
    if (params?.limit) q.set("limit", String(params.limit));
    const qs = q.toString();
    return mobileApi.get(`/products${qs ? `?${qs}` : ""}`);
  },
  get: (id: number) => mobileApi.get(`/products/${id}`),
};

export const cartApi = {
  get: () => mobileApi.get("/cart"),
  add: (productId: number, size: string, quantity: number) =>
    mobileApi.post("/cart", { productId, size, quantity }),
  update: (itemId: number, quantity: number, size?: string) =>
    mobileApi.put(`/cart/${itemId}`, size ? { quantity, size } : { quantity }),
  remove: (itemId: number) => mobileApi.delete(`/cart/${itemId}`),
};

export const paymentsApi = {
  createCheckout: (data: {
    source: "cart" | "buynow";
    buynowItem?: { productId: number; size: string; quantity: number };
    couponCode?: string;
    redeemPoints?: boolean;
    giftWrap?: boolean;
    giftNote?: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    pincode: string;
    district: string;
    landmark?: string;
    paymentMethod: "cod" | "upi";
  }) => mobileApi.post("/payments/checkout", data),
  confirmCod: (checkoutId: string) =>
    mobileApi.post("/payments/cod/confirm", { checkoutId }),
  createOrder: (checkoutId: string) =>
    mobileApi.post("/payments/create-order", { checkoutId }),
  verifyPayment: (data: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) => mobileApi.post("/payments/verify", data),
  retryPayment: (checkoutId: string) =>
    mobileApi.post("/payments/retry", { checkoutId }),
  checkoutStatus: (checkoutId: string) =>
    mobileApi.get(`/payments/checkout/${encodeURIComponent(checkoutId)}/status`),
};

export const ordersApi = {
  list: () => mobileApi.get("/orders"),
};

export const growthApi = {
  banner: () => mobileApi.get("/growth/banner"),
  looks: () => mobileApi.get("/growth/looks"),
  swatches: (productId: number, category?: string | null) =>
    mobileApi.get(
      `/growth/products/${productId}/swatches${
        category ? `?category=${encodeURIComponent(category)}` : ""
      }`
    ),
  loyalty: () => mobileApi.get("/growth/loyalty"),
  previewRedemption: (subtotal: number) =>
    mobileApi.post("/growth/loyalty/preview-redemption", { subtotal }),
  checkShipping: (pincode: string, subtotal: number) =>
    mobileApi.get(
      `/shipping/calculate?pincode=${encodeURIComponent(pincode)}&subtotal=${subtotal}`
    ),
  registerExpoPushToken: (payload: {
    token: string;
    platform: string;
    deviceName?: string;
  }) => mobileApi.post("/growth/push/expo-token", payload),
  removeExpoPushToken: (token?: string) =>
    mobileApi.delete("/growth/push/expo-token", token ? { token } : undefined),
};
