import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { AtelierTheme } from "../src/theme/atelier";
import { authApi, cartApi, saveAuthTokens } from "../src/lib/api";
import { useAuthStore, useGuestBagStore } from "../src/store";

export default function LoginScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ redirect?: string }>();
  const setUser = useAuthStore((s) => s.setUser);
  const guestItems = useGuestBagStore((s) => s.items);
  const clearGuestBag = useGuestBagStore((s) => s.clear);

  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      await authApi.sendOtp(cleanEmail);
      setStep("otp");
    } catch (err: any) {
      Alert.alert("Failed to send OTP", err?.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();
    if (cleanOtp.length < 4) {
      Alert.alert("Invalid OTP", "Please enter the OTP sent to your email.");
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.verifyOtp(cleanEmail, cleanOtp);
      if (res.accessToken || res.refreshToken) {
        await saveAuthTokens(res.accessToken, res.refreshToken);
      }
      if (res.user) {
        setUser(res.user);
      }

      // Sync any guest bag items into the authenticated server cart
      if (guestItems.length > 0) {
        for (const item of guestItems) {
          await cartApi
            .add(item.productId, item.size || "FREE_SIZE", item.quantity)
            .catch(() => undefined);
        }
        clearGuestBag();
      }

      await queryClient.invalidateQueries({ queryKey: ["cart"] });
      await queryClient.invalidateQueries({ queryKey: ["loyalty"] });

      if (params.redirect) {
        router.replace(params.redirect as any);
      } else {
        router.back();
      }
    } catch (err: any) {
      Alert.alert("Verification Failed", err?.message || "Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <View style={styles.card}>
        <View style={styles.badge}>
          <Ionicons name="sparkles" size={14} color={AtelierTheme.colors.plum} />
          <Text style={styles.badgeText}>QUEEN'S CIRCLE ACCESS</Text>
        </View>

        <Text style={styles.title}>
          {step === "email" ? "Sign in to Beauty Queen" : "Enter Verification Code"}
        </Text>
        <Text style={styles.subtitle}>
          {step === "email"
            ? "We'll send a one-time passcode to your email. No passwords to remember."
            : `We sent a 6-digit code to ${email.trim().toLowerCase()}.`}
        </Text>

        {step === "email" ? (
          <>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={AtelierTheme.colors.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              style={styles.input}
            />
            <Pressable
              onPress={handleSendOtp}
              disabled={loading}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && { opacity: 0.92 },
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color={AtelierTheme.colors.silk} />
              ) : (
                <Text style={styles.primaryBtnText}>Send OTP</Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <TextInput
              value={otp}
              onChangeText={setOtp}
              placeholder="6-digit OTP"
              placeholderTextColor={AtelierTheme.colors.muted}
              keyboardType="number-pad"
              maxLength={6}
              style={[styles.input, styles.otpInput]}
            />
            <Pressable
              onPress={handleVerifyOtp}
              disabled={loading}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && { opacity: 0.92 },
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color={AtelierTheme.colors.silk} />
              ) : (
                <Text style={styles.primaryBtnText}>Verify & Sign In</Text>
              )}
            </Pressable>
            <Pressable
              onPress={() => {
                setStep("email");
                setOtp("");
              }}
              style={styles.secondaryBtn}
            >
              <Text style={styles.secondaryBtnText}>Change Email</Text>
            </Pressable>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AtelierTheme.colors.silk,
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: AtelierTheme.colors.silkCard,
    borderRadius: AtelierTheme.radius.lg,
    borderWidth: 1,
    borderColor: AtelierTheme.colors.border,
    padding: 22,
    gap: 12,
  },
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: AtelierTheme.colors.zariSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: AtelierTheme.radius.pill,
  },
  badgeText: {
    color: AtelierTheme.colors.plum,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: AtelierTheme.colors.ink,
  },
  subtitle: {
    fontSize: 13,
    color: AtelierTheme.colors.muted,
    lineHeight: 19,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: AtelierTheme.colors.border,
    borderRadius: AtelierTheme.radius.sm,
    paddingHorizontal: 14,
    backgroundColor: AtelierTheme.colors.silk,
    color: AtelierTheme.colors.ink,
    fontSize: 15,
    marginTop: 4,
  },
  otpInput: {
    textAlign: "center",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 8,
  },
  primaryBtn: {
    backgroundColor: AtelierTheme.colors.crimson,
    paddingVertical: 14,
    borderRadius: AtelierTheme.radius.pill,
    alignItems: "center",
    marginTop: 6,
  },
  primaryBtnText: {
    color: AtelierTheme.colors.silk,
    fontWeight: "800",
    fontSize: 15,
  },
  secondaryBtn: {
    alignItems: "center",
    paddingVertical: 8,
  },
  secondaryBtnText: {
    color: AtelierTheme.colors.muted,
    fontWeight: "700",
    fontSize: 13,
  },
});
