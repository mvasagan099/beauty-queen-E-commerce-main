import React from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { AtelierTheme, formatPrice } from "../src/theme/atelier";
import { ordersApi, resolveImageUrl } from "../src/lib/api";
import { useAuthStore } from "../src/store";
import { MobileOrder } from "../src/types";

function getStatusColor(status: string) {
  const s = status.toUpperCase();
  if (s === "DELIVERED") return AtelierTheme.colors.success;
  if (s === "CANCELLED" || s === "RETURNED") return AtelierTheme.colors.danger;
  return AtelierTheme.colors.crimson;
}

export default function OrdersScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const ordersQuery = useQuery({
    queryKey: ["orders"],
    queryFn: () => ordersApi.list(),
    enabled: Boolean(user),
  });

  const orders: MobileOrder[] = ordersQuery.data?.orders ?? [];

  if (!user) {
    return (
      <View style={styles.centerBox}>
        <Ionicons
          name="lock-closed-outline"
          size={40}
          color={AtelierTheme.colors.zari}
        />
        <Text style={styles.emptyTitle}>Sign in to view your orders</Text>
        <Pressable
          onPress={() => router.replace("/login" as any)}
          style={styles.ctaBtn}
        >
          <Text style={styles.ctaBtnText}>Sign In</Text>
        </Pressable>
      </View>
    );
  }

  if (ordersQuery.isLoading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color={AtelierTheme.colors.crimson} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={orders}
      keyExtractor={(item) => String(item.id)}
      refreshing={ordersQuery.isRefetching}
      onRefresh={() => void ordersQuery.refetch()}
      renderItem={({ item }) => {
        const uri = resolveImageUrl(item.product?.image);
        const amount = Number(
          item.totalAmount ?? item.subtotal ?? item.price * item.quantity
        );
        const statusColor = getStatusColor(item.status || "PENDING");
        const dateLabel = item.orderDate
          ? new Date(item.orderDate).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : "";

        return (
          <View style={styles.orderCard}>
            <View style={styles.orderHeader}>
              <Text style={styles.orderId}>Order #{item.id}</Text>
              <View
                style={[
                  styles.statusPill,
                  { borderColor: statusColor },
                ]}
              >
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {(item.status || "PROCESSING").toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.orderRow}>
              <View style={styles.thumbWrap}>
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
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.name || "Beauty Queen Atelier Piece"}
                </Text>
                <Text style={styles.meta}>
                  Size: {item.size || "FREE_SIZE"} · Qty: {item.quantity}
                </Text>
                <Text style={styles.meta}>
                  {(item.paymentMethod || "COD").toUpperCase()} · {dateLabel}
                </Text>
              </View>
              <Text style={styles.amount}>{formatPrice(amount)}</Text>
            </View>
          </View>
        );
      }}
      ListEmptyComponent={
        <View style={styles.centerBox}>
          <Ionicons
            name="receipt-outline"
            size={42}
            color={AtelierTheme.colors.zari}
          />
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptySub}>
            Once you place an order, you can track its dispatch and delivery right here.
          </Text>
          <Pressable
            onPress={() => router.replace("/(tabs)/explore" as any)}
            style={styles.ctaBtn}
          >
            <Text style={styles.ctaBtnText}>Start Shopping</Text>
          </Pressable>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AtelierTheme.colors.silk,
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 10,
    backgroundColor: AtelierTheme.colors.silk,
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
  },
  ctaBtn: {
    marginTop: 6,
    backgroundColor: AtelierTheme.colors.plum,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: AtelierTheme.radius.pill,
  },
  ctaBtnText: {
    color: AtelierTheme.colors.zari,
    fontWeight: "800",
    fontSize: 13,
  },
  orderCard: {
    backgroundColor: AtelierTheme.colors.silkCard,
    borderRadius: AtelierTheme.radius.md,
    borderWidth: 1,
    borderColor: AtelierTheme.colors.border,
    padding: 14,
    gap: 10,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderId: {
    fontSize: 13,
    fontWeight: "800",
    color: AtelierTheme.colors.ink,
  },
  statusPill: {
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: AtelierTheme.radius.pill,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  orderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  thumbWrap: {
    width: 60,
    height: 74,
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
    fontSize: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "700",
    color: AtelierTheme.colors.ink,
  },
  meta: {
    fontSize: 12,
    color: AtelierTheme.colors.muted,
  },
  amount: {
    fontSize: 15,
    fontWeight: "800",
    color: AtelierTheme.colors.crimson,
  },
});
