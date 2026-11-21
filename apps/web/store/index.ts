import { create } from "zustand";
import { persist } from "zustand/middleware";

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

export interface GuestCartItem {
  id: number;
  productId: number;
  name: string;
  price: number;
  mrp: number | null;
  image: string | null;
  size: string;
  quantity: number;
  availableStock?: number;
  availableSizes?: string[];
}

interface GuestCartState {
  items: GuestCartItem[];
  addItem: (item: Omit<GuestCartItem, "id">) => void;
  updateItem: (id: number, quantity: number, size?: string) => void;
  removeItem: (id: number) => void;
  clear: () => void;
}

export const useGuestCartStore = create<GuestCartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (incoming) =>
        set((state) => {
          const existing = state.items.find(
            (i) => i.productId === incoming.productId && i.size === incoming.size,
          );
          if (existing) {
            const maxStock = incoming.availableStock ?? existing.availableStock ?? 99;
            const nextQty = Math.min(maxStock, existing.quantity + incoming.quantity);
            return {
              items: state.items.map((i) =>
                i.id === existing.id
                  ? {
                      ...i,
                      quantity: nextQty,
                      availableStock: incoming.availableStock ?? i.availableStock,
                      availableSizes: incoming.availableSizes ?? i.availableSizes,
                    }
                  : i,
              ),
            };
          }
          const nextId = state.items.reduce((m, i) => Math.max(m, i.id), 0) + 1;
          return {
            items: [...state.items, { ...incoming, id: nextId }],
          };
        }),
      updateItem: (id, quantity, size) =>
        set((state) => {
          const target = state.items.find((i) => i.id === id);
          if (!target) return state;
          if (quantity <= 0) {
            return { items: state.items.filter((i) => i.id !== id) };
          }
          const nextSize = size || target.size;
          const maxStock = target.availableStock ?? 99;
          const clampedQty = Math.min(maxStock, quantity);

          if (nextSize !== target.size) {
            const duplicate = state.items.find(
              (i) => i.id !== id && i.productId === target.productId && i.size === nextSize,
            );
            if (duplicate) {
              return {
                items: state.items
                  .filter((i) => i.id !== id)
                  .map((i) =>
                    i.id === duplicate.id
                      ? { ...i, quantity: Math.min(maxStock, i.quantity + clampedQty) }
                      : i,
                  ),
              };
            }
          }

          return {
            items: state.items.map((i) =>
              i.id === id ? { ...i, quantity: clampedQty, size: nextSize } : i,
            ),
          };
        }),
      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        })),
      clear: () => set({ items: [] }),
    }),
    {
      name: "beauty-queen-guest-cart",
    },
  ),
);

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
