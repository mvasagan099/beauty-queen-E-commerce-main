import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuthStore } from "../src/store";
import { AtelierTheme } from "../src/theme/atelier";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" backgroundColor={AtelierTheme.colors.plum} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: AtelierTheme.colors.plum },
            headerTintColor: AtelierTheme.colors.silk,
            headerTitleStyle: { fontWeight: "700", fontSize: 16 },
            contentStyle: { backgroundColor: AtelierTheme.colors.silk },
            headerBackTitle: "Back",
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="product/[id]"
            options={{ title: "Atelier Piece" }}
          />
          <Stack.Screen
            name="checkout"
            options={{ title: "Atelier Checkout" }}
          />
          <Stack.Screen
            name="payment"
            options={{ title: "UPI / Card Payment" }}
          />
          <Stack.Screen
            name="login"
            options={{ title: "Sign In", presentation: "modal" }}
          />
          <Stack.Screen
            name="orders"
            options={{ title: "My Orders" }}
          />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
