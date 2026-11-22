import React from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { AtelierTheme, formatPrice } from "../../src/theme/atelier";
import { cartApi, resolveImageUrl } from "../../src/lib/api";
import { useAuthStore, useGuestBagStore } from "../../src/store";
import { MobileCartItem } from "../../src/types";

const FREE_SHIPPING_THRESHOLD = 999;

export default function BagScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const guestItems = useGuestBagStore((s) => s.items);
  const updateGuestQty = useGuestBagStore((s) => s.updateQty);
  const removeGuestItem = useGuestBagStore((s) => s.removeItem);

  const cartQuery = useQuery({
    queryKey: ["cart"],
    queryFn: () => cartApi.get(),
    enabled: Boolean(user),
  });

  const items: MobileCartItem[] = user
    ? cartQuery.data?.items || cartQuery.data?.cart?.items || []
    : guestItems;

  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.price || 0) * item.quantity,
    0
  );
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progressPct = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  const handleUpdateQty = async (item: MobileCartItem, nextQty: number) => {
    if (!user) {
      updateGuestQty(item.productId, item.size, nextQty);
      return;
    }
    if (!item.id) return;
    try {
      if (nextQty <= 0) {
        await cartApi.remove(item.id);
      } else {
        await cartApi.update(item.id, nextQty);
      }
      await queryClient.invalidateQueries({ queryKey: ["cart"] });
    } catch (err: any) {
      Alert.alert("Bag update failed", err?.message || "Please try again.");
    }
  };

  const handleRemove = async (item: MobileCartItem) => {
    if (!user) {
      removeGuestItem(item.productId, item.size);
      return;
    }
    if (!item.id) return;
    try {
      await cartApi.remove(item.id);
      await queryClient.invalidateQueries({ queryKey: ["cart"] });
    } catch (err: any) {
      Alert.alert("Could not remove item", err?.message || "Please try again.");
    }
  };

  const handleProceedCheckout = () => {
    if (!user) {
      router.push({
        pathname: "/login",
        params: { redirect: "/checkout" },
      } as any);
      return;
    }
    router.push("/checkout" as any);
  };

  if (user && cartQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={AtelierTheme.colors.crimson} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {items.length > 0 ? (
        <View style={styles.shippingBanner}>
          <View style={styles.shippingRow}>
            <Ionicons
              name={remainingForFreeShipping === 0 ? "checkmark-circle" : "gift-outline"}
              size={16}
              color={
                remainingForFreeShipping === 0
                  ? AtelierTheme.colors.success
                  : AtelierTheme.colors.crimson
              }
            />
            <Text style={styles.shippingText}>
              {remainingForFreeShipping === 0
                ? "Complimentary insured Atelier shipping unlocked!"
                : `Add ${formatPrice(remainingForFreeShipping)} more for free shipping across India`}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item, idx) =>
          String(item.id ?? `${item.productId}-${item.size}-${idx}`)
        }
        contentContainerStyle={styles.listContent}
        refreshing={Boolean(user && cartQuery.isRefetching)}
        onRefresh={() => {
          if (user) void cartQuery.refetch();
        }}
        renderItem={({ item }) => {
          const uri = resolveImageUrl(item.image);
          return (
            <View style={styles.itemCard}>
              <Pressable
                onPress={() => router.push(`/product/${item.productId}` as any)}
                style={styles.thumbWrap}
              >
                {uri ? (
                  <Image
                    source={{ uri }}
                    style={styles.thumb}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.thumbPlaceholder}>
                    <Text style={styles.thumbInitial}>BQ</Text>
                  </View>
                )}
              </Pressable>

              <View style={styles.itemBody}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Pressable onPress={() => handleRemove(item)} hitSlop={8}>
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={AtelierTheme.colors.muted}
                    />
                  </Pressable>
                </View>

                <Text style={styles.itemSize}>
                  Size: {item.size === "FREE_SIZE" ? "Free Size" : item.size}
                </Text>

                <View style={styles.itemBottom}>
                  <Text style={styles.itemPrice}>
                    {formatPrice(item.price * item.quantity)}
                  </Text>
                  <View style={styles.qtyControl}>
                    <Pressable
                      onPress={() => handleUpdateQty(item, item.quantity - 1)}
                      style={styles.qtyBtn}
                    >
                      <Ionicons
                        name="remove"
                        size={15}
                        color={AtelierTheme.colors.ink}
                      />
                    </Pressable>
                    <Text style={styles.qtyValue}>{item.quantity}</Text>
                    <Pressable
                      onPress={() => handleUpdateQty(item, item.quantity + 1)}
                      style={styles.qtyBtn}
                    >
                      <Ionicons
                        name="add"
                        size={15}
                        color={AtelierTheme.colors.ink}
                      />
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons
              name="bag-handle-outline"
              size={44}
              color={AtelierTheme.colors.zari}
            />
            <Text style={styles.emptyTitle}>Your Atelier Bag is empty</Text>
            <Text style={styles.emptySub}>
              Discover handpicked Kanjeevaram sarees, embroidered kurthis, and velvet cosmetics.
            </Text>
            <Pressable
              onPress={() => router.push("/(tabs)/explore" as any)}
              style={styles.exploreBtn}
            >
              <Text style={styles.exploreBtnText}>Explore Collection</Text>
            </Pressable>
          </View>
        }
      />

      {items.length > 0 ? (
        <View style={styles.footer}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Estimated Total</Text>
            <Text style={styles.summaryTotal}>{formatPrice(subtotal)}</Text>
          </View>
          <Text style={styles.summaryNote}>
            Coupons, Queen's Circle points & Festive Silk Gift Wrap available at checkout.
          </Text>
          <Pressable
            onPress={handleProceedCheckout}
            style={({ pressed }) => [
              styles.checkoutBtn,
              pressed && { opacity: 0.92 },
            ]}
          >
            <Text style={styles.checkoutBtnText}>
              {user ? "Proceed to Checkout" : "Sign In to Checkout"}
            </Text>
            <Ionicons
              name="arrow-forward"
              size={18}
              color={AtelierTheme.colors.silk}
            />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AtelierTheme.colors.silk,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AtelierTheme.colors.silk,
  },
  shippingBanner: {
    backgroundColor: AtelierTheme.colors.silkCard,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AtelierTheme.colors.border,
    gap: 8,
  },
  shippingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  shippingText: {
    fontSize: 12,
    fontWeight: "600",
    color: AtelierTheme.colors.ink,
    flex: 1,
  },
  progressTrack: {
    height: 5,
    borderRadius: 999,
    backgroundColor: AtelierTheme.colors.silkMuted,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: AtelierTheme.colors.crimson,
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 24,
  },
  itemCard: {
    flexDirection: "row",
    backgroundColor: AtelierTheme.colors.silkCard,
    borderRadius: AtelierTheme.radius.md,
    borderWidth: 1,
    borderColor: AtelierTheme.colors.border,
    padding: 12,
    gap: 12,
  },
  thumbWrap: {
    width: 82,
    height: 102,
    borderRadius: AtelierTheme.radius.sm,
    overflow: "hidden",
    backgroundColor: AtelierTheme.colors.silkMuted,
  },
  thumb: {
    width: "100%",
    height: "100%",
  },
  thumbPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AtelierTheme.colors.plum,
  },
  thumbInitial: {
    color: AtelierTheme.colors.zari,
    fontWeight: "800",
  },
  itemBody: {
    flex: 1,
    justifyContent: "space-between",
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: AtelierTheme.colors.ink,
    lineHeight: 19,
  },
  itemSize: {
    fontSize: 12,
    color: AtelierTheme.colors.muted,
    marginTop: 2,
  },
  itemBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: AtelierTheme.colors.crimson,
  },
  qtyControl: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: AtelierTheme.colors.border,
    borderRadius: AtelierTheme.radius.pill,
    backgroundColor: AtelierTheme.colors.silk,
  },
  qtyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  qtyValue: {
    minWidth: 22,
    textAlign: "center",
    fontWeight: "700",
    fontSize: 13,
    color: AtelierTheme.colors.ink,
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 64,
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: AtelierTheme.colors.ink,
  },
  emptySub: {
    fontSize: 13,
    color: AtelierTheme.colors.muted,
    textAlign: "center",
    lineHeight: 19,
  },
  exploreBtn: {
    marginTop: 8,
    backgroundColor: AtelierTheme.colors.plum,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: AtelierTheme.radius.pill,
  },
  exploreBtnText: {
    color: AtelierTheme.colors.zari,
    fontWeight: "800",
    fontSize: 13,
  },
  footer: {
    backgroundColor: AtelierTheme.colors.silkCard,
    borderTopWidth: 1,
    borderTopColor: AtelierTheme.colors.border,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
    gap: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: AtelierTheme.colors.muted,
  },
  summaryTotal: {
    fontSize: 20,
    fontWeight: "800",
    color: AtelierTheme.colors.ink,
  },
  summaryNote: {
    fontSize: 11,
    color: AtelierTheme.colors.muted,
  },
  checkoutBtn: {
    marginTop: 4,
    backgroundColor: AtelierTheme.colors.crimson,
    borderRadius: AtelierTheme.radius.pill,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  checkoutBtnText: {
    color: AtelierTheme.colors.silk,
    fontWeight: "800",
    fontSize: 15,
  },
});
