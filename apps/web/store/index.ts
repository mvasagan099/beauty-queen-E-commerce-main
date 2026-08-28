import { create } from "zustand";

interface AuthState {
  user: { id: number; email: string; role: string; name: string | null } | null;
  setUser: (user: AuthState["user"]) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null }),
}));

interface UIState {
  isCartOpen: boolean;
  isMobileMenuOpen: boolean;
  searchQuery: string;
  setCartOpen: (open: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isCartOpen: false,
  isMobileMenuOpen: false,
  searchQuery: "",
  setCartOpen: (open) => set({ isCartOpen: open }),
  setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),
  setSearchQuery: (query) => set({ searchQuery: query }),
}));

interface BuyNowItem {
  productId: number;
  name: string;
  size: string;
  quantity: number;
  price: number;
  mrp: number | null;
  image: string | null;
  subtotal: number;
}

interface CheckoutState {
  mode: "cart" | "buynow" | null;
  buyNowItem: BuyNowItem | null;
  setBuyNowItem: (item: BuyNowItem) => void;
  setCartMode: () => void;
  clearCheckout: () => void;
}

export const useCheckoutStore = create<CheckoutState>((set) => ({
  mode: null,
  buyNowItem: null,
  setBuyNowItem: (item) => set({ mode: "buynow", buyNowItem: item }),
  setCartMode: () => set({ mode: "cart", buyNowItem: null }),
  clearCheckout: () => set({ mode: null, buyNowItem: null }),
}));
