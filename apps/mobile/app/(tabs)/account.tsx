import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { AtelierTheme, formatPrice } from "../../src/theme/atelier";
import { useAuthStore } from "../../src/store";
import { growthApi } from "../../src/lib/api";
import { LoyaltySummary } from "../../src/types";

export default function AccountScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  const loyaltyQuery = useQuery({
    queryKey: ["loyalty"],
    queryFn: () => growthApi.loyalty(),
    enabled: Boolean(user && user.role === "CUSTOMER"),
  });

  const loyalty: LoyaltySummary | null = loyaltyQuery.data?.loyalty ?? null;

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out of Beauty Queen?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          queryClient.clear();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Member Identity Card */}
      <View style={styles.memberCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.name || user?.email || "BQ").slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.memberEyebrow}>QUEEN'S CIRCLE</Text>
          <Text style={styles.memberName}>
            {user ? user.name || "Atelier Member" : "Welcome, Guest"}
          </Text>
          <Text style={styles.memberEmail}>
            {user
              ? user.email
              : "Sign in with OTP to earn loyalty points & track orders"}
          </Text>
        </View>
      </View>

      {!user ? (
        <Pressable
          onPress={() => router.push("/login" as any)}
          style={({ pressed }) => [styles.signInCta, pressed && { opacity: 0.92 }]}
        >
          <Ionicons name="mail-outline" size={18} color={AtelierTheme.colors.plum} />
          <Text style={styles.signInCtaText}>Sign In with Email OTP</Text>
        </Pressable>
      ) : null}

      {/* Loyalty Tier Card */}
      {user ? (
        <View style={styles.loyaltyCard}>
          <View style={styles.loyaltyHeader}>
            <View>
              <Text style={styles.loyaltyLabel}>LOYALTY TIER</Text>
              <Text style={styles.loyaltyTier}>
                {loyalty?.tier || "Rose"} Member
              </Text>
            </View>
            <View style={styles.pointsBadge}>
              <Ionicons name="sparkles" size={14} color={AtelierTheme.colors.plum} />
              <Text style={styles.pointsBadgeText}>
                {loyalty?.points ?? 0} pts
              </Text>
            </View>
          </View>

          {loyaltyQuery.isLoading ? (
            <ActivityIndicator
              size="small"
              color={AtelierTheme.colors.zari}
              style={{ marginVertical: 12 }}
            />
          ) : loyalty ? (
            <>
              <Text style={styles.loyaltyNote}>
                10 points = ₹1 off at checkout (up to 15% of order value).
              </Text>
              {loyalty.nextTier ? (
                <Text style={styles.loyaltyProgress}>
                  Spend {formatPrice(loyalty.spendToNextTier)} more to unlock{" "}
                  <Text style={{ fontWeight: "800", color: AtelierTheme.colors.zari }}>
                    {loyalty.nextTier}
                  </Text>
                </Text>
              ) : (
                <Text style={styles.loyaltyProgress}>
                  You have reached our highest Royal Zari tier!
                </Text>
              )}

              <View style={styles.referralBox}>
                <View>
                  <Text style={styles.referralLabel}>YOUR REFERRAL CODE</Text>
                  <Text style={styles.referralCode}>{loyalty.referralCode}</Text>
                </View>
                <Text style={styles.referralBonus}>+200 pts each</Text>
              </View>
            </>
          ) : null}
        </View>
      ) : null}

      {/* Navigation Rows */}
      <View style={styles.menuCard}>
        <Pressable
          onPress={() =>
            router.push((user ? "/orders" : "/login") as any)
          }
          style={styles.menuRow}
        >
          <View style={styles.menuLeft}>
            <Ionicons
              name="receipt-outline"
              size={20}
              color={AtelierTheme.colors.crimson}
            />
            <Text style={styles.menuTitle}>My Orders</Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={AtelierTheme.colors.muted}
          />
        </Pressable>

        <View style={styles.menuDivider} />

        <Pressable
          onPress={() => router.push("/(tabs)/bag" as any)}
          style={styles.menuRow}
        >
          <View style={styles.menuLeft}>
            <Ionicons
              name="bag-handle-outline"
              size={20}
              color={AtelierTheme.colors.crimson}
            />
            <Text style={styles.menuTitle}>Shopping Bag</Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={AtelierTheme.colors.muted}
          />
        </Pressable>

        <View style={styles.menuDivider} />

        <Pressable
          onPress={() => router.push("/(tabs)/explore" as any)}
          style={styles.menuRow}
        >
          <View style={styles.menuLeft}>
            <Ionicons
              name="compass-outline"
              size={20}
              color={AtelierTheme.colors.crimson}
            />
            <Text style={styles.menuTitle}>Browse All Collections</Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={AtelierTheme.colors.muted}
          />
        </Pressable>
      </View>

      {user ? (
        <Pressable onPress={handleSignOut} style={styles.signOutBtn}>
          <Ionicons
            name="log-out-outline"
            size={18}
            color={AtelierTheme.colors.danger}
          />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      ) : null}

      <Text style={styles.versionNote}>
        Beauty Queen Atelier · Native Mobile v1.0.0
      </Text>
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
    paddingBottom: 32,
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: AtelierTheme.colors.silkCard,
    borderRadius: AtelierTheme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: AtelierTheme.colors.border,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: AtelierTheme.colors.plum,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: AtelierTheme.colors.zari,
  },
  avatarText: {
    color: AtelierTheme.colors.zari,
    fontWeight: "800",
    fontSize: 18,
  },
  memberEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
    color: AtelierTheme.colors.crimson,
  },
  memberName: {
    fontSize: 18,
    fontWeight: "800",
    color: AtelierTheme.colors.ink,
    marginTop: 2,
  },
  memberEmail: {
    fontSize: 12,
    color: AtelierTheme.colors.muted,
    marginTop: 2,
  },
  signInCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: AtelierTheme.colors.zari,
    paddingVertical: 14,
    borderRadius: AtelierTheme.radius.pill,
  },
  signInCtaText: {
    color: AtelierTheme.colors.plum,
    fontWeight: "800",
    fontSize: 15,
  },
  loyaltyCard: {
    backgroundColor: AtelierTheme.colors.plum,
    borderRadius: AtelierTheme.radius.lg,
    padding: 18,
    gap: 10,
  },
  loyaltyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  loyaltyLabel: {
    color: AtelierTheme.colors.zari,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  loyaltyTier: {
    color: AtelierTheme.colors.silk,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 2,
  },
  pointsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: AtelierTheme.colors.zari,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: AtelierTheme.radius.pill,
  },
  pointsBadgeText: {
    color: AtelierTheme.colors.plum,
    fontWeight: "800",
    fontSize: 13,
  },
  loyaltyNote: {
    color: "#DFD1C7",
    fontSize: 12,
  },
  loyaltyProgress: {
    color: AtelierTheme.colors.silk,
    fontSize: 13,
  },
  referralBox: {
    marginTop: 4,
    backgroundColor: AtelierTheme.colors.plumSoft,
    borderRadius: AtelierTheme.radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(212, 163, 83, 0.45)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  referralLabel: {
    color: "#C7B5B9",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  referralCode: {
    color: AtelierTheme.colors.zari,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 2,
    letterSpacing: 1.2,
  },
  referralBonus: {
    color: AtelierTheme.colors.silk,
    fontSize: 12,
    fontWeight: "700",
  },
  menuCard: {
    backgroundColor: AtelierTheme.colors.silkCard,
    borderRadius: AtelierTheme.radius.md,
    borderWidth: 1,
    borderColor: AtelierTheme.colors.border,
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: AtelierTheme.colors.ink,
  },
  menuDivider: {
    height: 1,
    backgroundColor: AtelierTheme.colors.border,
    marginLeft: 48,
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: AtelierTheme.radius.md,
    borderWidth: 1,
    borderColor: "#E8C6C6",
    backgroundColor: "#FFF5F5",
  },
  signOutText: {
    color: AtelierTheme.colors.danger,
    fontWeight: "700",
    fontSize: 14,
  },
  versionNote: {
    textAlign: "center",
    color: AtelierTheme.colors.muted,
    fontSize: 11,
    marginTop: 6,
  },
});
