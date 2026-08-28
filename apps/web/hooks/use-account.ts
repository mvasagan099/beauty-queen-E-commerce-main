import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi, wishlistApi, ordersApi, reviewsApi, notificationsApi } from "@/lib/api";
import { useAuthStore } from "@/store";
import { Address, Review, WishlistItem, Order, NotificationListResponse } from "@/types";

export function useCurrentUser() {
  const { setUser } = useAuthStore();
  return useQuery({
    queryKey: ["auth-me"],
    queryFn: async () => {
      const res = await usersApi.me();
      if (res.user) setUser(res.user);
      return res;
    },
    retry: false,
  });
}

export function useAddresses() {
  return useQuery<{ success: boolean; addresses: Address[] }>({
    queryKey: ["addresses"],
    queryFn: () => usersApi.getAddresses(),
  });
}

export function useCreateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => usersApi.createAddress(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["addresses"] }),
  });
}

export function useUpdateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      usersApi.updateAddress(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["addresses"] }),
  });
}

export function useSetDefaultAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => usersApi.setDefaultAddress(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["addresses"] }),
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => usersApi.deleteAddress(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["addresses"] }),
  });
}

export function useWishlist() {
  return useQuery<{ success: boolean; items: WishlistItem[]; count: number }>({
    queryKey: ["wishlist"],
    queryFn: () => wishlistApi.list(),
  });
}

export function useToggleWishlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId: number) => wishlistApi.toggle(productId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wishlist"] }),
  });
}

export function useOrders() {
  return useQuery<{ success: boolean; orders: Order[] }>({
    queryKey: ["orders"],
    queryFn: () => ordersApi.list(),
  });
}

export function useProductReviews(productId: number) {
  return useQuery<{ success: boolean; reviews: Review[]; avgRating: number; totalReviews: number }>({
    queryKey: ["reviews", productId],
    queryFn: () => reviewsApi.getByProduct(productId),
    enabled: !!productId,
  });
}

export function useMyReviews() {
  return useQuery<{ success: boolean; reviews: Review[] }>({
    queryKey: ["my-reviews"],
    queryFn: () => reviewsApi.getMyReviews(),
  });
}

export function useCanReview(productId: number, enabled = true) {
  return useQuery<{ success: boolean; canReview: boolean; verifiedPurchase: boolean }>({
    queryKey: ["can-review", productId],
    queryFn: () => reviewsApi.canReview(productId),
    enabled: enabled && !!productId,
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { productId: number; rating: number; comment?: string; title?: string }) =>
      reviewsApi.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["reviews", variables.productId] });
      queryClient.invalidateQueries({ queryKey: ["my-reviews"] });
    },
  });
}

export function useUpdateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { rating?: number; comment?: string; title?: string } }) =>
      reviewsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-reviews"] });
    },
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => reviewsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-reviews"] });
    },
  });
}

export function useNotifications(page = 1, limit = 20) {
  return useQuery<NotificationListResponse>({
    queryKey: ["notifications", page, limit],
    queryFn: () => notificationsApi.list(page, limit),
    refetchInterval: 30000,
  });
}

export function useUnreadNotificationCount() {
  return useQuery<{ success: boolean; count: number }>({
    queryKey: ["notifications-unread-count"],
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: 30000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
}
