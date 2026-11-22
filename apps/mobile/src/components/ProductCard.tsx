import React from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { AtelierTheme, formatPrice } from "../theme/atelier";
import { resolveImageUrl } from "../lib/api";
import { MobileProduct } from "../types";

interface ProductCardProps {
  product: MobileProduct;
}

export function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const imgUrl = resolveImageUrl(product.image || product.image1);
  const hasDiscount =
    product.mrp != null && product.mrp > (product.price || 0);
  const discountPct = hasDiscount
    ? Math.round(((product.mrp! - product.price) / product.mrp!) * 100)
    : 0;

  return (
    <Pressable
      onPress={() => router.push(`/product/${product.id}` as any)}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
    >
      <View style={styles.imageWrap}>
        {imgUrl ? (
          <Image source={{ uri: imgUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>BQ</Text>
          </View>
        )}
        {discountPct > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{discountPct}% OFF</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        {product.ptype ? (
          <Text style={styles.category} numberOfLines={1}>
            {product.ptype.toUpperCase()}
          </Text>
        ) : null}
        <Text style={styles.title} numberOfLines={2}>
          {product.name || "Beauty Queen Piece"}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatPrice(product.price)}</Text>
          {hasDiscount && (
            <Text style={styles.mrp}>{formatPrice(product.mrp)}</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: AtelierTheme.colors.silkCard,
    borderRadius: AtelierTheme.radius.md,
    borderWidth: 1,
    borderColor: AtelierTheme.colors.border,
    overflow: "hidden",
    marginBottom: 12,
  },
  imageWrap: {
    width: "100%",
    aspectRatio: 0.8,
    backgroundColor: AtelierTheme.colors.silkMuted,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AtelierTheme.colors.plum,
  },
  placeholderText: {
    color: AtelierTheme.colors.zari,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 3,
  },
  badge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: AtelierTheme.colors.plum,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: AtelierTheme.radius.pill,
  },
  badgeText: {
    color: AtelierTheme.colors.zari,
    fontSize: 10,
    fontWeight: "700",
  },
  body: {
    padding: 10,
    gap: 4,
  },
  category: {
    fontSize: 10,
    letterSpacing: 1.2,
    color: AtelierTheme.colors.muted,
    fontWeight: "600",
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    color: AtelierTheme.colors.ink,
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  price: {
    fontSize: 14,
    fontWeight: "700",
    color: AtelierTheme.colors.crimson,
  },
  mrp: {
    fontSize: 12,
    color: AtelierTheme.colors.muted,
    textDecorationLine: "line-through",
  },
});
