import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { AtelierTheme, formatPrice } from "../src/theme/atelier";
import { paymentsApi } from "../src/lib/api";

function serializeForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export default function PaymentScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    checkoutId?: string;
    razorpayOrderId?: string;
    razorpayKeyId?: string;
    amount?: string;
    name?: string;
    email?: string;
    phone?: string;
  }>();

  const checkoutId = params.checkoutId || "";
  const [orderId, setOrderId] = useState(params.razorpayOrderId || "");
  const [keyId, setKeyId] = useState(params.razorpayKeyId || "");
  const amountInr = Number(params.amount || 0);
  const amountPaise = Math.round(amountInr * 100);

  const [verifying, setVerifying] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [webViewKey, setWebViewKey] = useState(0);

  const checkoutHtml = useMemo(() => {
    const serializedConfig = serializeForScript({
      key: keyId,
      amount: amountPaise,
      currency: "INR",
      name: "Beauty Queen Atelier",
      description: "Order Checkout",
      order_id: orderId,
      prefill: {
        name: params.name || "Beauty Queen Customer",
        email: params.email || "",
        contact: params.phone || "",
      },
      theme: { color: "#A81C44" },
    });

    return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
  <style>
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #1A0B10;
      color: #FBF7F2;
      display: flex;
      min-height: 100vh;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 24px;
      box-sizing: border-box;
    }
    .card {
      background: #2D1B22;
      border: 1px solid rgba(212, 163, 83, 0.45);
      border-radius: 18px;
      padding: 28px 22px;
      max-width: 340px;
      width: 100%;
    }
    h2 { margin: 0 0 8px; color: #D4A353; font-size: 20px; }
    p { margin: 0 0 18px; color: #E5D7CE; font-size: 13px; line-height: 1.5; }
    button {
      background: #A81C44;
      color: #FBF7F2;
      border: none;
      border-radius: 999px;
      padding: 13px 24px;
      font-size: 14px;
      font-weight: 700;
      width: 100%;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="card">
    <h2>Beauty Queen Atelier</h2>
    <p>Opening Razorpay UPI, Cards &amp; NetBanking secure checkout...</p>
    <button id="pay-btn" onclick="openRazorpay()">Pay Now</button>
  </div>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <script>
    function post(payload) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }
    }
    var BASE_OPTIONS = ${serializedConfig};
    function openRazorpay() {
      if (typeof Razorpay === "undefined") {
        post({ type: "error", message: "Razorpay SDK failed to load. Check your network connection." });
        return;
      }
      var options = Object.assign({}, BASE_OPTIONS, {
        handler: function (response) {
          post({
            type: "success",
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature
          });
        },
        modal: {
          ondismiss: function () {
            post({ type: "dismissed" });
          }
        }
      });
      var rzp = new Razorpay(options);
      rzp.on("payment.failed", function (resp) {
        post({
          type: "failed",
          message: (resp && resp.error && resp.error.description) || "Payment failed"
        });
      });
      rzp.open();
    }
    window.onload = function () { setTimeout(openRazorpay, 350); };
  </script>
</body>
</html>`;
  }, [keyId, orderId, amountPaise, params.name, params.email, params.phone]);

  const handleMessage = async (event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "success") {
        setVerifying(true);
        setStatusMessage("Verifying payment signature with Atelier server...");
        try {
          await paymentsApi.verifyPayment({
            razorpayOrderId: msg.razorpayOrderId,
            razorpayPaymentId: msg.razorpayPaymentId,
            razorpaySignature: msg.razorpaySignature,
          });
          await queryClient.invalidateQueries({ queryKey: ["cart"] });
          await queryClient.invalidateQueries({ queryKey: ["orders"] });
          await queryClient.invalidateQueries({ queryKey: ["loyalty"] });
          Alert.alert(
            "Payment Confirmed!",
            "Your Beauty Queen Atelier order is confirmed and being prepared.",
            [{ text: "View My Orders", onPress: () => router.replace("/orders" as any) }]
          );
        } catch (err: any) {
          setFailed(true);
          setStatusMessage(
            err?.message || "Payment verification failed. You can retry or check order status."
          );
        } finally {
          setVerifying(false);
        }
      } else if (msg.type === "failed" || msg.type === "error") {
        setFailed(true);
        setStatusMessage(msg.message || "Payment was not completed.");
      } else if (msg.type === "dismissed") {
        setFailed(true);
        setStatusMessage("Payment sheet closed before completion.");
      }
    } catch {
      // ignore non-JSON bridge messages
    }
  };

  const handleRetry = async () => {
    if (!checkoutId) return;
    setVerifying(true);
    setStatusMessage("Preparing fresh Razorpay UPI session...");
    try {
      const res = await paymentsApi.retryPayment(checkoutId);
      const data = res?.data ?? res;
      if (data?.razorpayOrderId) {
        setOrderId(data.razorpayOrderId);
      }
      if (data?.keyId) {
        setKeyId(data.keyId);
      }
      setFailed(false);
      setStatusMessage(null);
      setWebViewKey((k) => k + 1);
    } catch (err: any) {
      Alert.alert("Retry Unavailable", err?.message || "Please check your order status.");
    } finally {
      setVerifying(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!checkoutId) return;
    setVerifying(true);
    try {
      const res = await paymentsApi.checkoutStatus(checkoutId);
      const paymentStatus = res?.data?.status ?? res?.status ?? "PENDING";
      if (String(paymentStatus).toUpperCase() === "CAPTURED") {
        await queryClient.invalidateQueries({ queryKey: ["orders"] });
        router.replace("/orders" as any);
      } else {
        Alert.alert(
          "Payment Status",
          `Current status: ${paymentStatus}. You can retry payment now or complete later from Orders.`
        );
      }
    } catch (err: any) {
      Alert.alert("Status Check Failed", err?.message || "Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  if (!orderId || !keyId) {
    return (
      <View style={styles.fallbackContainer}>
        <Ionicons name="shield-checkmark-outline" size={44} color={AtelierTheme.colors.zari} />
        <Text style={styles.fallbackTitle}>Razorpay Gateway Not Configured</Text>
        <Text style={styles.fallbackSub}>
          Your checkout ({checkoutId || "pending"}) was created for {formatPrice(amountInr)}, but Razorpay API keys are not active on the server yet.
        </Text>
        <Pressable
          onPress={() => router.replace("/orders" as any)}
          style={styles.primaryBtn}
        >
          <Text style={styles.primaryBtnText}>View Order Status</Text>
        </Pressable>
      </View>
    );
  }

  if (verifying) {
    return (
      <View style={styles.fallbackContainer}>
        <ActivityIndicator size="large" color={AtelierTheme.colors.zari} />
        <Text style={styles.fallbackTitle}>Securing Your Order</Text>
        <Text style={styles.fallbackSub}>{statusMessage || "Please wait..."}</Text>
      </View>
    );
  }

  if (failed) {
    return (
      <View style={styles.fallbackContainer}>
        <Ionicons name="alert-circle-outline" size={46} color={AtelierTheme.colors.zari} />
        <Text style={styles.fallbackTitle}>Payment Not Completed</Text>
        <Text style={styles.fallbackSub}>
          {statusMessage || "You can retry UPI/Card payment or check your payment status."}
        </Text>
        <Pressable onPress={handleRetry} style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>
            Retry Payment · {formatPrice(amountInr)}
          </Text>
        </Pressable>
        <Pressable onPress={handleCheckStatus} style={styles.secondaryBtn}>
          <Text style={styles.secondaryBtnText}>Check Payment Status</Text>
        </Pressable>
        <Pressable onPress={() => router.replace("/orders" as any)} style={styles.linkBtn}>
          <Text style={styles.linkBtnText}>Go to My Orders</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        key={webViewKey}
        originWhitelist={["*"]}
        source={{ html: checkoutHtml, baseUrl: "https://checkout.razorpay.com" }}
        javaScriptEnabled
        domStorageEnabled
        onMessage={handleMessage}
        onShouldStartLoadWithRequest={(req) => {
          // Hand off UPI intent links (upi://, tez://, phonepe://, paytmmp://) directly to native UPI apps
          if (
            req.url.startsWith("upi://") ||
            req.url.startsWith("tez://") ||
            req.url.startsWith("phonepe://") ||
            req.url.startsWith("paytmmp://") ||
            req.url.startsWith("gpay://")
          ) {
            void Linking.openURL(req.url).catch(() => undefined);
            return false;
          }
          return true;
        }}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AtelierTheme.colors.plum,
  },
  webview: {
    flex: 1,
    backgroundColor: AtelierTheme.colors.plum,
  },
  fallbackContainer: {
    flex: 1,
    backgroundColor: AtelierTheme.colors.plum,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    gap: 12,
  },
  fallbackTitle: {
    color: AtelierTheme.colors.silk,
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  fallbackSub: {
    color: "#E3D6CE",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 8,
  },
  primaryBtn: {
    backgroundColor: AtelierTheme.colors.crimson,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: AtelierTheme.radius.pill,
    width: "100%",
    alignItems: "center",
  },
  primaryBtnText: {
    color: AtelierTheme.colors.silk,
    fontWeight: "800",
    fontSize: 15,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: AtelierTheme.colors.zari,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: AtelierTheme.radius.pill,
    width: "100%",
    alignItems: "center",
  },
  secondaryBtnText: {
    color: AtelierTheme.colors.zari,
    fontWeight: "700",
    fontSize: 14,
  },
  linkBtn: {
    paddingVertical: 8,
  },
  linkBtnText: {
    color: "#DFD1C7",
    fontSize: 13,
    textDecorationLine: "underline",
  },
});
