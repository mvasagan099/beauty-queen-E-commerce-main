import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Switch,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { AtelierTheme, formatPrice } from "../src/theme/atelier";
import { cartApi, growthApi, paymentsApi } from "../src/lib/api";
import { useAuthStore } from "../src/store";

const GIFT_WRAP_FEE = 49;

export default function CheckoutScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const params = useLocalSearchParams<{
    source?: string;
    productId?: string;
    size?: string;
    quantity?: string;
    name?: string;
    price?: string;
  }>();

  const isBuyNow = params.source === "buynow" && Boolean(params.productId);

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [district, setDistrict] = useState("");
  const [landmark, setLandmark] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [redeemPoints, setRedeemPoints] = useState(false);
  const [giftWrap, setGiftWrap] = useState(false);
  const [giftNote, setGiftNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "upi">("cod");
  const [submitting, setSubmitting] = useState(false);

  const cartQuery = useQuery({
    queryKey: ["cart"],
    queryFn: () => cartApi.get(),
    enabled: Boolean(user && !isBuyNow),
  });

  const subtotal = isBuyNow
    ? Number(params.price || 0) * Math.max(1, Number(params.quantity || 1))
    : Number(cartQuery.data?.subtotal ?? cartQuery.data?.cart?.subtotal ?? 0);

  const loyaltyPreviewQuery = useQuery({
    queryKey: ["loyalty-preview", subtotal],
    queryFn: () => growthApi.previewRedemption(subtotal),
    enabled: Boolean(user && subtotal > 0),
  });

  const previewDiscountInr = Number(
    loyaltyPreviewQuery.data?.discountInr ??
      loyaltyPreviewQuery.data?.discountAmount ??
      0
  );
  const pointsDiscount = redeemPoints ? previewDiscountInr : 0;
  const availablePoints = Number(loyaltyPreviewQuery.data?.availablePoints ?? 0);
  const redeemablePoints = Number(loyaltyPreviewQuery.data?.redeemablePoints ?? 0);

  const estimatedTotal = Math.max(
    0,
    subtotal - pointsDiscount + (giftWrap ? GIFT_WRAP_FEE : 0)
  );

  const handlePlaceOrder = async () => {
    if (!user) {
      router.push("/login" as any);
      return;
    }

    if (
      !name.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !address.trim() ||
      !pincode.trim() ||
      !district.trim()
    ) {
      Alert.alert(
        "Incomplete Details",
        "Please fill in your name, email, phone, address, pincode, and city/district."
      );
      return;
    }

    if (!/^\d{6}$/.test(pincode.trim())) {
      Alert.alert("Invalid Pincode", "Please enter a valid 6-digit Indian pincode.");
      return;
    }

    setSubmitting(true);
    try {
      const checkoutRes = await paymentsApi.createCheckout({
        source: isBuyNow ? "buynow" : "cart",
        buynowItem: isBuyNow
          ? {
              productId: Number(params.productId),
              size: params.size || "FREE_SIZE",
              quantity: Math.max(1, Number(params.quantity || 1)),
            }
          : undefined,
        couponCode: couponCode.trim() || undefined,
        redeemPoints,
        giftWrap,
        giftNote: giftWrap && giftNote.trim() ? giftNote.trim() : undefined,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        pincode: pincode.trim(),
        district: district.trim(),
        landmark: landmark.trim() || undefined,
        paymentMethod,
      });

      const checkoutData = checkoutRes?.data ?? checkoutRes;
      const checkoutId: string | undefined = checkoutData?.checkoutId;

      if (paymentMethod === "cod" && checkoutId) {
        await paymentsApi.confirmCod(checkoutId);
        await queryClient.invalidateQueries({ queryKey: ["cart"] });
        await queryClient.invalidateQueries({ queryKey: ["orders"] });
        await queryClient.invalidateQueries({ queryKey: ["loyalty"] });
        Alert.alert(
          "Order Confirmed!",
          "Your Beauty Queen Atelier COD order has been placed. Track it in My Orders.",
          [{ text: "View Orders", onPress: () => router.replace("/orders" as any) }]
        );
      } else {
        let razorpayOrderId: string = checkoutData?.razorpayOrderId || "";
        let razorpayKeyId: string = checkoutData?.razorpayKeyId || "";
        const payableAmount = Number(checkoutData?.totalAmount ?? estimatedTotal);

        if (checkoutId && (!razorpayOrderId || !razorpayKeyId)) {
          try {
            const orderRes = await paymentsApi.createOrder(checkoutId);
            const orderData = orderRes?.data ?? orderRes;
            razorpayOrderId = orderData?.razorpayOrderId || razorpayOrderId;
            razorpayKeyId = orderData?.keyId || razorpayKeyId;
          } catch {
            // fallback screen inside /payment handles missing gateway key gracefully
          }
        }

        await queryClient.invalidateQueries({ queryKey: ["cart"] });
        await queryClient.invalidateQueries({ queryKey: ["orders"] });
        router.replace({
          pathname: "/payment",
          params: {
            checkoutId: checkoutId || "",
            razorpayOrderId,
            razorpayKeyId,
            amount: String(payableAmount),
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
          },
        } as any);
      }
    } catch (err: any) {
      Alert.alert(
        "Checkout Error",
        err?.message || "Unable to complete checkout right now."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Delivery Details */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Delivery Address</Text>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Full Name"
          placeholderTextColor={AtelierTheme.colors.muted}
          style={styles.input}
        />
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email Address"
          placeholderTextColor={AtelierTheme.colors.muted}
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="10-digit Mobile Number"
          placeholderTextColor={AtelierTheme.colors.muted}
          keyboardType="phone-pad"
          maxLength={12}
          style={styles.input}
        />
        <TextInput
          value={address}
          onChangeText={setAddress}
          placeholder="House / Street / Locality"
          placeholderTextColor={AtelierTheme.colors.muted}
          multiline
          style={[styles.input, { minHeight: 72, textAlignVertical: "top", paddingTop: 10 }]}
        />
        <View style={styles.rowInputs}>
          <TextInput
            value={pincode}
            onChangeText={setPincode}
            placeholder="6-digit Pincode"
            placeholderTextColor={AtelierTheme.colors.muted}
            keyboardType="number-pad"
            maxLength={6}
            style={[styles.input, { flex: 1 }]}
          />
          <TextInput
            value={district}
            onChangeText={setDistrict}
            placeholder="City / District"
            placeholderTextColor={AtelierTheme.colors.muted}
            style={[styles.input, { flex: 1 }]}
          />
        </View>
        <TextInput
          value={landmark}
          onChangeText={setLandmark}
          placeholder="Landmark (Optional)"
          placeholderTextColor={AtelierTheme.colors.muted}
          style={styles.input}
        />
      </View>

      {/* Offers & Loyalty */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Atelier Privileges</Text>

        <TextInput
          value={couponCode}
          onChangeText={(t) => setCouponCode(t.toUpperCase())}
          placeholder="Coupon Code (e.g. SILK15)"
          placeholderTextColor={AtelierTheme.colors.muted}
          autoCapitalize="characters"
          style={styles.input}
        />

        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleTitle}>Redeem Queen's Circle Points</Text>
            <Text style={styles.toggleSub}>
              {availablePoints > 0
                ? `Use ${redeemablePoints} of ${availablePoints} pts to save ${formatPrice(
                    previewDiscountInr
                  )}`
                : "Earn points with every Atelier purchase (10 pts = ₹1)"}
            </Text>
          </View>
          <Switch
            value={redeemPoints}
            onValueChange={setRedeemPoints}
            disabled={redeemablePoints <= 0}
            trackColor={{
              false: AtelierTheme.colors.border,
              true: AtelierTheme.colors.crimson,
            }}
            thumbColor={AtelierTheme.colors.silkCard}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleTitle}>
              Festive Silk Gift Wrap (+{formatPrice(GIFT_WRAP_FEE)})
            </Text>
            <Text style={styles.toggleSub}>
              Wrapped in signature Kora silk pouch with wax seal & card
            </Text>
          </View>
          <Switch
            value={giftWrap}
            onValueChange={setGiftWrap}
            trackColor={{
              false: AtelierTheme.colors.border,
              true: AtelierTheme.colors.crimson,
            }}
            thumbColor={AtelierTheme.colors.silkCard}
          />
        </View>

        {giftWrap ? (
          <TextInput
            value={giftNote}
            onChangeText={setGiftNote}
            placeholder="Add a handwritten gift message (max 240 chars)"
            placeholderTextColor={AtelierTheme.colors.muted}
            maxLength={240}
            multiline
            style={[styles.input, { minHeight: 64, textAlignVertical: "top", paddingTop: 10 }]}
          />
        ) : null}
      </View>

      {/* Payment Method */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Payment Method</Text>
        <View style={styles.paymentRow}>
          <Pressable
            onPress={() => setPaymentMethod("cod")}
            style={[
              styles.paymentOption,
              paymentMethod === "cod" && styles.paymentOptionActive,
            ]}
          >
            <Ionicons
              name="cash-outline"
              size={20}
              color={
                paymentMethod === "cod"
                  ? AtelierTheme.colors.zari
                  : AtelierTheme.colors.ink
              }
            />
            <Text
              style={[
                styles.paymentLabel,
                paymentMethod === "cod" && styles.paymentLabelActive,
              ]}
            >
              Cash on Delivery
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setPaymentMethod("upi")}
            style={[
              styles.paymentOption,
              paymentMethod === "upi" && styles.paymentOptionActive,
            ]}
          >
            <Ionicons
              name="flash-outline"
              size={20}
              color={
                paymentMethod === "upi"
                  ? AtelierTheme.colors.zari
                  : AtelierTheme.colors.ink
              }
            />
            <Text
              style={[
                styles.paymentLabel,
                paymentMethod === "upi" && styles.paymentLabelActive,
              ]}
            >
              UPI / Razorpay
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Order Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryLine}>
          <Text style={styles.summaryKey}>
            {isBuyNow ? params.name || "Selected Piece" : "Bag Subtotal"}
          </Text>
          <Text style={styles.summaryVal}>{formatPrice(subtotal)}</Text>
        </View>
        {pointsDiscount > 0 ? (
          <View style={styles.summaryLine}>
            <Text style={[styles.summaryKey, { color: AtelierTheme.colors.success }]}>
              Queen's Circle Points
            </Text>
            <Text style={[styles.summaryVal, { color: AtelierTheme.colors.success }]}>
              -{formatPrice(pointsDiscount)}
            </Text>
          </View>
        ) : null}
        {giftWrap ? (
          <View style={styles.summaryLine}>
            <Text style={styles.summaryKey}>Festive Silk Gift Wrap</Text>
            <Text style={styles.summaryVal}>+{formatPrice(GIFT_WRAP_FEE)}</Text>
          </View>
        ) : null}
        <View style={styles.divider} />
        <View style={styles.summaryLine}>
          <Text style={styles.totalKey}>Estimated Payable</Text>
          <Text style={styles.totalVal}>{formatPrice(estimatedTotal)}</Text>
        </View>
      </View>

      <Pressable
        onPress={handlePlaceOrder}
        disabled={submitting}
        style={({ pressed }) => [
          styles.placeBtn,
          pressed && { opacity: 0.92 },
          submitting && { opacity: 0.7 },
        ]}
      >
        {submitting ? (
          <ActivityIndicator size="small" color={AtelierTheme.colors.silk} />
        ) : (
          <Text style={styles.placeBtnText}>
            {paymentMethod === "cod"
              ? `Confirm COD Order · ${formatPrice(estimatedTotal)}`
              : `Continue to UPI · ${formatPrice(estimatedTotal)}`}
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AtelierTheme.colors.silk,
  },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 36,
  },
  card: {
    backgroundColor: AtelierTheme.colors.silkCard,
    borderRadius: AtelierTheme.radius.md,
    borderWidth: 1,
    borderColor: AtelierTheme.colors.border,
    padding: 16,
    gap: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: AtelierTheme.colors.ink,
    marginBottom: 2,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: AtelierTheme.colors.border,
    borderRadius: AtelierTheme.radius.sm,
    paddingHorizontal: 12,
    color: AtelierTheme.colors.ink,
    backgroundColor: AtelierTheme.colors.silk,
    fontSize: 14,
  },
  rowInputs: {
    flexDirection: "row",
    gap: 10,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: AtelierTheme.colors.ink,
  },
  toggleSub: {
    fontSize: 12,
    color: AtelierTheme.colors.muted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: AtelierTheme.colors.border,
    marginVertical: 4,
  },
  paymentRow: {
    flexDirection: "row",
    gap: 10,
  },
  paymentOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: AtelierTheme.radius.sm,
    borderWidth: 1,
    borderColor: AtelierTheme.colors.border,
    backgroundColor: AtelierTheme.colors.silk,
  },
  paymentOptionActive: {
    backgroundColor: AtelierTheme.colors.plum,
    borderColor: AtelierTheme.colors.plum,
  },
  paymentLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: AtelierTheme.colors.ink,
  },
  paymentLabelActive: {
    color: AtelierTheme.colors.zari,
  },
  summaryCard: {
    backgroundColor: AtelierTheme.colors.silkCard,
    borderRadius: AtelierTheme.radius.md,
    borderWidth: 1,
    borderColor: AtelierTheme.colors.border,
    padding: 16,
    gap: 8,
  },
  summaryLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryKey: {
    fontSize: 13,
    color: AtelierTheme.colors.muted,
  },
  summaryVal: {
    fontSize: 14,
    fontWeight: "700",
    color: AtelierTheme.colors.ink,
  },
  totalKey: {
    fontSize: 15,
    fontWeight: "800",
    color: AtelierTheme.colors.ink,
  },
  totalVal: {
    fontSize: 20,
    fontWeight: "800",
    color: AtelierTheme.colors.crimson,
  },
  placeBtn: {
    backgroundColor: AtelierTheme.colors.crimson,
    paddingVertical: 15,
    borderRadius: AtelierTheme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  placeBtnText: {
    color: AtelierTheme.colors.silk,
    fontWeight: "800",
    fontSize: 15,
  },
});
