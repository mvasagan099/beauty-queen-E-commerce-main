import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  TextInput,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { AtelierTheme, formatPrice } from "../../src/theme/atelier";
import {
  cartApi,
  growthApi,
  productsApi,
  resolveImageUrl,
} from "../../src/lib/api";
import { useAuthStore, useGuestBagStore } from "../../src/store";
import { MobileProduct, ProductSwatch } from "../../src/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface SizeOption {
  size: string;
  label: string;
  stock: number;
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = Number(id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const addGuestItem = useGuestBagStore((s) => s.addItem);

  const [activeSlide, setActiveSlide] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedSwatch, setSelectedSwatch] = useState<ProductSwatch | null>(
    null
  );
  const [pincode, setPincode] = useState("");
  const [checkingPin, setCheckingPin] = useState(false);
  const [shippingResult, setShippingResult] = useState<{
    message: string;
    codAvailable?: boolean;
    estimatedDays?: string;
    shippingCharge?: number;
  } | null>(null);
  const [adding, setAdding] = useState(false);

  const productQuery = useQuery({
    queryKey: ["product", productId],
    queryFn: () => productsApi.get(productId),
    enabled: Number.isFinite(productId) && productId > 0,
  });

  const product: MobileProduct | null =
    productQuery.data?.product ?? productQuery.data ?? null;

  const swatchesQuery = useQuery({
    queryKey: ["swatches", productId, product?.ptype],
    queryFn: () => growthApi.swatches(productId, product?.ptype),
    enabled: Boolean(product?.id),
  });

  const swatches: ProductSwatch[] = swatchesQuery.data?.swatches ?? [];

  const gallery = useMemo(() => {
    if (!product) return [] as string[];
    const raw = [
      selectedSwatch?.image,
      product.image,
      product.image1,
      product.image2,
      product.image3,
      product.image4,
    ];
    const seen = new Set<string>();
    const urls: string[] = [];
    for (const r of raw) {
      const resolved = resolveImageUrl(r);
      if (resolved && !seen.has(resolved)) {
        seen.add(resolved);
        urls.push(resolved);
      }
    }
    return urls;
  }, [product, selectedSwatch]);

  const sizeOptions: SizeOption[] = useMemo(() => {
    if (!product) return [];
    const sized: SizeOption[] = [
      { size: "S", label: "S", stock: Number(product.sizeS ?? 0) },
      { size: "M", label: "M", stock: Number(product.sizeM ?? 0) },
      { size: "L", label: "L", stock: Number(product.sizeL ?? 0) },
      { size: "XL", label: "XL", stock: Number(product.sizeXl ?? 0) },
      { size: "XXL", label: "XXL", stock: Number(product.sizeXxl ?? 0) },
    ];
    const hasApparelSizes = sized.some((s) => s.stock > 0);
    if (hasApparelSizes) return sized;
    return [
      {
        size: "FREE_SIZE",
        label: "Free Size",
        stock: Number(product.quantity ?? 10),
      },
    ];
  }, [product]);

  useEffect(() => {
    if (!selectedSize && sizeOptions.length > 0) {
      const firstInStock = sizeOptions.find((s) => s.stock > 0) || sizeOptions[0];
      setSelectedSize(firstInStock.size);
    }
  }, [sizeOptions, selectedSize]);

  const handleCheckPincode = async () => {
    const clean = pincode.trim();
    if (!/^\d{6}$/.test(clean)) {
      Alert.alert("Invalid Pincode", "Please enter a valid 6-digit Indian pincode.");
      return;
    }
    setCheckingPin(true);
    try {
      const res = await growthApi.checkShipping(clean, Number(product?.price || 0));
      const data = res?.data ?? res;
      const days =
        data?.estimatedDays ||
        (data?.minDays && data?.maxDays ? `${data.minDays}-${data.maxDays} days` : "3-5 days");
      const charge = Number(data?.shippingCharge ?? data?.charge ?? 0);
      setShippingResult({
        message:
          charge === 0
            ? `Free delivery to ${clean} in ${days}`
            : `Delivery to ${clean} in ${days} (${formatPrice(charge)})`,
        codAvailable: data?.codAvailable !== false,
        estimatedDays: days,
        shippingCharge: charge,
      });
    } catch (err: any) {
      Alert.alert("Pincode Check Failed", err?.message || "Please try again.");
    } finally {
      setCheckingPin(false);
    }
  };

  const handleAddToBag = async (buyNow = false) => {
    if (!product) return;
    const sizeToUse = selectedSize || "FREE_SIZE";
    setAdding(true);
    try {
      if (buyNow) {
        if (!user) {
          addGuestItem({
            productId: product.id,
            name: product.name || "Beauty Queen Piece",
            price: product.price,
            mrp: product.mrp,
            image: product.image,
            size: sizeToUse,
            quantity: 1,
          });
          router.push({
            pathname: "/login",
            params: { redirect: "/checkout" },
          } as any);
          return;
        }
        router.push({
          pathname: "/checkout",
          params: {
            source: "buynow",
            productId: String(product.id),
            size: sizeToUse,
            quantity: "1",
            name: product.name || "Beauty Queen Piece",
            price: String(product.price),
          },
        } as any);
        return;
      }

      if (user) {
        await cartApi.add(product.id, sizeToUse, 1);
        await queryClient.invalidateQueries({ queryKey: ["cart"] });
      } else {
        addGuestItem({
          productId: product.id,
          name: product.name || "Beauty Queen Piece",
          price: product.price,
          mrp: product.mrp,
          image: product.image,
          size: sizeToUse,
          quantity: 1,
        });
      }

      Alert.alert("Added to Bag", `${product.name || "Piece"} (${sizeToUse}) added.`, [
        { text: "Continue", style: "cancel" },
        { text: "View Bag", onPress: () => router.push("/(tabs)/bag" as any) },
      ]);
    } catch (err: any) {
      Alert.alert("Could not add to bag", err?.message || "Please try again.");
    } finally {
      setAdding(false);
    }
  };

  if (productQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={AtelierTheme.colors.crimson} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Product not found.</Text>
      </View>
    );
  }

  const hasDiscount = product.mrp != null && product.mrp > product.price;
  const discountPct = hasDiscount
    ? Math.round(((product.mrp! - product.price) / product.mrp!) * 100)
    : 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Image Carousel */}
        <View style={styles.galleryWrap}>
          {gallery.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(
                  e.nativeEvent.contentOffset.x / SCREEN_WIDTH
                );
                setActiveSlide(idx);
              }}
            >
              {gallery.map((uri) => (
                <Image
                  key={uri}
                  source={{ uri }}
                  style={styles.galleryImage}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.galleryImage, styles.galleryPlaceholder]}>
              <Text style={styles.galleryPlaceholderText}>BEAUTY QUEEN</Text>
            </View>
          )}

          {discountPct > 0 ? (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{discountPct}% OFF</Text>
            </View>
          ) : null}

          {gallery.length > 1 ? (
            <View style={styles.dotsRow}>
              {gallery.map((_, idx) => (
                <View
                  key={idx}
                  style={[styles.dot, idx === activeSlide && styles.dotActive]}
                />
              ))}
            </View>
          ) : null}
        </View>

        {/* Details */}
        <View style={styles.detailsBody}>
          {product.ptype ? (
            <Text style={styles.category}>{product.ptype.toUpperCase()}</Text>
          ) : null}
          <Text style={styles.title}>{product.name}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(product.price)}</Text>
            {hasDiscount ? (
              <Text style={styles.mrp}>{formatPrice(product.mrp)}</Text>
            ) : null}
            {discountPct > 0 ? (
              <Text style={styles.saveLabel}>Save {discountPct}%</Text>
            ) : null}
          </View>
          <Text style={styles.taxNote}>Inclusive of all GST & Atelier packaging</Text>

          {/* Color / Shade Swatches */}
          {swatches.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
                SHADE / COLOR:{" "}
                <Text style={{ color: AtelierTheme.colors.ink }}>
                  {selectedSwatch?.name || swatches[0].name}
                </Text>
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.swatchesRow}
              >
                {swatches.map((sw) => {
                  const active = (selectedSwatch?.id || swatches[0].id) === sw.id;
                  return (
                    <Pressable
                      key={sw.id}
                      onPress={() => {
                        setSelectedSwatch(sw);
                        setActiveSlide(0);
                      }}
                      style={[
                        styles.swatchOuter,
                        active && styles.swatchOuterActive,
                      ]}
                    >
                      <View
                        style={[
                          styles.swatchFill,
                          { backgroundColor: sw.hex || AtelierTheme.colors.crimson },
                        ]}
                      />
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          {/* Size Selector */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SELECT SIZE</Text>
            <View style={styles.sizesRow}>
              {sizeOptions.map((opt) => {
                const active = selectedSize === opt.size;
                const disabled = opt.stock <= 0;
                return (
                  <Pressable
                    key={opt.size}
                    disabled={disabled}
                    onPress={() => setSelectedSize(opt.size)}
                    style={[
                      styles.sizePill,
                      active && styles.sizePillActive,
                      disabled && styles.sizePillDisabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.sizeText,
                        active && styles.sizeTextActive,
                        disabled && styles.sizeTextDisabled,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Pincode ETA Estimator */}
          <View style={styles.pincodeCard}>
            <Text style={styles.sectionLabel}>DELIVERY & COD AVAILABILITY</Text>
            <View style={styles.pincodeRow}>
              <TextInput
                value={pincode}
                onChangeText={setPincode}
                placeholder="Enter 6-digit pincode (e.g. 600001)"
                placeholderTextColor={AtelierTheme.colors.muted}
                keyboardType="number-pad"
                maxLength={6}
                style={styles.pincodeInput}
              />
              <Pressable
                onPress={handleCheckPincode}
                disabled={checkingPin}
                style={styles.pincodeBtn}
              >
                {checkingPin ? (
                  <ActivityIndicator size="small" color={AtelierTheme.colors.zari} />
                ) : (
                  <Text style={styles.pincodeBtnText}>Check</Text>
                )}
              </Pressable>
            </View>
            {shippingResult ? (
              <View style={styles.shippingFeedback}>
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={AtelierTheme.colors.success}
                />
                <Text style={styles.shippingFeedbackText}>
                  {shippingResult.message}
                  {shippingResult.codAvailable ? " · COD Available" : ""}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Description */}
          {product.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>ATELIER NOTES</Text>
              <Text style={styles.description}>{product.description}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={styles.stickyBar}>
        <Pressable
          onPress={() => handleAddToBag(false)}
          disabled={adding}
          style={({ pressed }) => [
            styles.addBagBtn,
            pressed && { opacity: 0.9 },
          ]}
        >
          <Ionicons
            name="bag-add-outline"
            size={18}
            color={AtelierTheme.colors.plum}
          />
          <Text style={styles.addBagText}>Add to Bag</Text>
        </Pressable>

        <Pressable
          onPress={() => handleAddToBag(true)}
          disabled={adding}
          style={({ pressed }) => [
            styles.buyNowBtn,
            pressed && { opacity: 0.9 },
          ]}
        >
          {adding ? (
            <ActivityIndicator size="small" color={AtelierTheme.colors.silk} />
          ) : (
            <Text style={styles.buyNowText}>Buy Now</Text>
          )}
        </Pressable>
      </View>
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
  errorText: {
    color: AtelierTheme.colors.muted,
    fontSize: 15,
  },
  scrollContent: {
    paddingBottom: 96,
  },
  galleryWrap: {
    position: "relative",
    backgroundColor: AtelierTheme.colors.silkMuted,
  },
  galleryImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 1.12,
  },
  galleryPlaceholder: {
    backgroundColor: AtelierTheme.colors.plum,
    alignItems: "center",
    justifyContent: "center",
  },
  galleryPlaceholderText: {
    color: AtelierTheme.colors.zari,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 3,
  },
  discountBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    backgroundColor: AtelierTheme.colors.plum,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: AtelierTheme.radius.pill,
  },
  discountText: {
    color: AtelierTheme.colors.zari,
    fontSize: 11,
    fontWeight: "800",
  },
  dotsRow: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  dotActive: {
    width: 20,
    backgroundColor: AtelierTheme.colors.zari,
  },
  detailsBody: {
    padding: 18,
    gap: 8,
  },
  category: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: AtelierTheme.colors.crimson,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: AtelierTheme.colors.ink,
    lineHeight: 28,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    marginTop: 4,
  },
  price: {
    fontSize: 24,
    fontWeight: "800",
    color: AtelierTheme.colors.crimson,
  },
  mrp: {
    fontSize: 16,
    color: AtelierTheme.colors.muted,
    textDecorationLine: "line-through",
  },
  saveLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: AtelierTheme.colors.success,
  },
  taxNote: {
    fontSize: 11,
    color: AtelierTheme.colors.muted,
  },
  section: {
    marginTop: 14,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: AtelierTheme.colors.muted,
  },
  swatchesRow: {
    gap: 10,
    paddingVertical: 2,
  },
  swatchOuter: {
    width: 38,
    height: 38,
    borderRadius: 19,
    padding: 3,
    borderWidth: 1.5,
    borderColor: AtelierTheme.colors.border,
  },
  swatchOuterActive: {
    borderColor: AtelierTheme.colors.plum,
    borderWidth: 2,
  },
  swatchFill: {
    flex: 1,
    borderRadius: 16,
  },
  sizesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sizePill: {
    minWidth: 52,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: AtelierTheme.radius.sm,
    borderWidth: 1,
    borderColor: AtelierTheme.colors.border,
    backgroundColor: AtelierTheme.colors.silkCard,
    alignItems: "center",
  },
  sizePillActive: {
    backgroundColor: AtelierTheme.colors.plum,
    borderColor: AtelierTheme.colors.plum,
  },
  sizePillDisabled: {
    opacity: 0.4,
  },
  sizeText: {
    fontSize: 13,
    fontWeight: "700",
    color: AtelierTheme.colors.ink,
  },
  sizeTextActive: {
    color: AtelierTheme.colors.zari,
  },
  sizeTextDisabled: {
    textDecorationLine: "line-through",
  },
  pincodeCard: {
    marginTop: 14,
    backgroundColor: AtelierTheme.colors.silkCard,
    borderRadius: AtelierTheme.radius.md,
    borderWidth: 1,
    borderColor: AtelierTheme.colors.border,
    padding: 14,
    gap: 10,
  },
  pincodeRow: {
    flexDirection: "row",
    gap: 8,
  },
  pincodeInput: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderColor: AtelierTheme.colors.border,
    borderRadius: AtelierTheme.radius.sm,
    paddingHorizontal: 12,
    color: AtelierTheme.colors.ink,
    backgroundColor: AtelierTheme.colors.silk,
  },
  pincodeBtn: {
    backgroundColor: AtelierTheme.colors.plum,
    paddingHorizontal: 18,
    borderRadius: AtelierTheme.radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  pincodeBtnText: {
    color: AtelierTheme.colors.zari,
    fontWeight: "800",
    fontSize: 13,
  },
  shippingFeedback: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  shippingFeedbackText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: AtelierTheme.colors.success,
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    color: AtelierTheme.colors.ink,
  },
  stickyBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
    backgroundColor: AtelierTheme.colors.silkCard,
    borderTopWidth: 1,
    borderTopColor: AtelierTheme.colors.border,
  },
  addBagBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: AtelierTheme.radius.pill,
    borderWidth: 1.5,
    borderColor: AtelierTheme.colors.plum,
    backgroundColor: AtelierTheme.colors.silk,
  },
  addBagText: {
    color: AtelierTheme.colors.plum,
    fontWeight: "800",
    fontSize: 14,
  },
  buyNowBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: AtelierTheme.radius.pill,
    backgroundColor: AtelierTheme.colors.crimson,
  },
  buyNowText: {
    color: AtelierTheme.colors.silk,
    fontWeight: "800",
    fontSize: 14,
  },
});
