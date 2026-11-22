import { create } from "zustand";
import { MobileCartItem, MobileUser } from "../types";
import { authApi, clearAuthTokens, getAccessToken } from "../lib/api";

interface AuthState {
  user: MobileUser | null;
  hydrated: boolean;
  setUser: (user: MobileUser | null) => void;
  hydrate: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  hydrated: false,
  setUser: (user) => set({ user, hydrated: true }),
  hydrate: async () => {
    try {
      const token = await getAccessToken();
      if (!token) {
        set({ user: null, hydrated: true });
        return;
      }
      const res = await authApi.me();
      if (res?.user) {
        set({
          user: {
            id: res.user.sub || res.user.id,
            email: res.user.email,
            role: res.user.role,
            name: res.user.name || null,
          },
          hydrated: true,
        });
      } else {
        set({ user: null, hydrated: true });
      }
    } catch {
      set({ user: null, hydrated: true });
    }
  },
  signOut: async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore network error on logout
    } finally {
      await clearAuthTokens();
      set({ user: null });
    }
  },
}));

interface GuestBagState {
  items: MobileCartItem[];
  addItem: (item: MobileCartItem) => void;
  updateQty: (productId: number, size: string, qty: number) => void;
  removeItem: (productId: number, size: string) => void;
  clear: () => void;
}

export const useGuestBagStore = create<GuestBagState>((set) => ({
  items: [],
  addItem: (incoming) =>
    set((state) => {
      const idx = state.items.findIndex(
        (i) => i.productId === incoming.productId && i.size === incoming.size
      );
      if (idx >= 0) {
        const next = [...state.items];
        next[idx] = {
          ...next[idx],
          quantity: next[idx].quantity + incoming.quantity,
        };
        return { items: next };
      }
      return { items: [...state.items, incoming] };
    }),
  updateQty: (productId, size, qty) =>
    set((state) => ({
      items:
        qty <= 0
          ? state.items.filter(
              (i) => !(i.productId === productId && i.size === size)
            )
          : state.items.map((i) =>
              i.productId === productId && i.size === size
                ? { ...i, quantity: qty }
                : i
            ),
    })),
  removeItem: (productId, size) =>
    set((state) => ({
      items: state.items.filter(
        (i) => !(i.productId === productId && i.size === size)
      ),
    })),
  clear: () => set({ items: [] }),
}));
