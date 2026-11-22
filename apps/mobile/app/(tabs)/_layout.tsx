import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { AtelierTheme } from "../../src/theme/atelier";
import { useAuthStore, useGuestBagStore } from "../../src/store";
import { cartApi } from "../../src/lib/api";

export default function TabsLayout() {
  const user = useAuthStore((s) => s.user);
  const guestCount = useGuestBagStore((s) =>
    s.items.reduce((sum, item) => sum + item.quantity, 0)
  );

  const { data: serverCart } = useQuery({
    queryKey: ["cart"],
    queryFn: () => cartApi.get(),
    enabled: Boolean(user),
  });

  const bagCount = user
    ? Number(serverCart?.itemCount ?? serverCart?.cart?.itemCount ?? 0)
    : guestCount;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: AtelierTheme.colors.plum },
        headerTintColor: AtelierTheme.colors.silk,
        headerTitleStyle: {
          fontWeight: "700",
          letterSpacing: 0.6,
        },
        tabBarStyle: {
          backgroundColor: AtelierTheme.colors.silkCard,
          borderTopColor: AtelierTheme.colors.border,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: AtelierTheme.colors.crimson,
        tabBarInactiveTintColor: AtelierTheme.colors.muted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Atelier",
          headerTitle: "BEAUTY QUEEN",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "sparkles" : "sparkles-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          headerTitle: "Explore Collections",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "search" : "search-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="bag"
        options={{
          title: "Bag",
          headerTitle: "Shopping Bag",
          tabBarBadge: bagCount > 0 ? (bagCount > 99 ? "99+" : bagCount) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: AtelierTheme.colors.crimson,
            color: AtelierTheme.colors.silk,
            fontSize: 10,
            fontWeight: "700",
          },
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "bag-handle" : "bag-handle-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          headerTitle: "Queen's Circle",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
