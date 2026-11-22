import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { AtelierTheme } from "../../src/theme/atelier";
import { productsApi } from "../../src/lib/api";
import { MobileProduct } from "../../src/types";
import { ProductCard } from "../../src/components/ProductCard";

const CATEGORIES = [
  { label: "All", value: "" },
  { label: "Sarees", value: "saree" },
  { label: "Kurthis", value: "kurthi" },
  { label: "Tops", value: "top" },
  { label: "Leggings", value: "leggin" },
  { label: "Cosmetics", value: "cosmetics" },
];

const SIZES = ["", "S", "M", "L", "XL", "XXL", "FREE_SIZE"];

const SORTS = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low-High", value: "price_asc" },
  { label: "Price: High-Low", value: "price_desc" },
];

export default function ExploreScreen() {
  const params = useLocalSearchParams<{ category?: string; search?: string }>();
  const [search, setSearch] = useState(params.search || "");
  const [debouncedSearch, setDebouncedSearch] = useState(params.search || "");
  const [category, setCategory] = useState(params.category || "");
  const [size, setSize] = useState("");
  const [sort, setSort] = useState("newest");

  useEffect(() => {
    if (typeof params.category === "string") {
      setCategory(params.category);
    }
  }, [params.category]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 280);
    return () => clearTimeout(timer);
  }, [search]);

  const productsQuery = useQuery({
    queryKey: ["products", { category, search: debouncedSearch, size, sort }],
    queryFn: () =>
      productsApi.list({
        category: category || undefined,
        search: debouncedSearch || undefined,
        size: size || undefined,
        sort,
        limit: 40,
      }),
  });

  const products: MobileProduct[] = productsQuery.data?.products ?? [];

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={AtelierTheme.colors.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search Kanjeevaram sarees, kurthis, shades..."
          placeholderTextColor={AtelierTheme.colors.muted}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {search.length > 0 ? (
          <Pressable onPress={() => setSearch("")} hitSlop={8}>
            <Ionicons
              name="close-circle"
              size={18}
              color={AtelierTheme.colors.muted}
            />
          </Pressable>
        ) : null}
      </View>

      {/* Category Chips */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {CATEGORIES.map((c) => {
            const active = category === c.value;
            return (
              <Pressable
                key={c.label}
                onPress={() => setCategory(c.value)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Size & Sort Row */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subFiltersRow}
        >
          {SORTS.map((s) => {
            const active = sort === s.value;
            return (
              <Pressable
                key={s.value}
                onPress={() => setSort(s.value)}
                style={[styles.miniPill, active && styles.miniPillActive]}
              >
                <Text
                  style={[styles.miniPillText, active && styles.miniPillTextActive]}
                >
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
          <View style={styles.divider} />
          {SIZES.map((sz) => {
            const active = size === sz;
            const label =
              sz === "" ? "Any Size" : sz === "FREE_SIZE" ? "Free Size" : sz;
            return (
              <Pressable
                key={label}
                onPress={() => setSize(sz)}
                style={[styles.miniPill, active && styles.miniPillActive]}
              >
                <Text
                  style={[styles.miniPillText, active && styles.miniPillTextActive]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Product Grid */}
      {productsQuery.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={AtelierTheme.colors.crimson} />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={styles.columnWrap}
          contentContainerStyle={styles.listContent}
          refreshing={productsQuery.isRefetching}
          onRefresh={() => void productsQuery.refetch()}
          renderItem={({ item }) => <ProductCard product={item} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons
                name="sparkles-outline"
                size={34}
                color={AtelierTheme.colors.zari}
              />
              <Text style={styles.emptyTitle}>No matching pieces found</Text>
              <Text style={styles.emptySub}>
                Try clearing a filter or exploring another collection.
              </Text>
              <Pressable
                onPress={() => {
                  setCategory("");
                  setSize("");
                  setSearch("");
                  setSort("newest");
                }}
                style={styles.resetBtn}
              >
                <Text style={styles.resetText}>Reset Filters</Text>
              </Pressable>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AtelierTheme.colors.silk,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AtelierTheme.colors.silkCard,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: AtelierTheme.radius.pill,
    borderWidth: 1,
    borderColor: AtelierTheme.colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: AtelierTheme.colors.ink,
    fontSize: 14,
  },
  chipsRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: AtelierTheme.radius.pill,
    backgroundColor: AtelierTheme.colors.silkCard,
    borderWidth: 1,
    borderColor: AtelierTheme.colors.border,
  },
  chipActive: {
    backgroundColor: AtelierTheme.colors.plum,
    borderColor: AtelierTheme.colors.plum,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
    color: AtelierTheme.colors.ink,
  },
  chipTextActive: {
    color: AtelierTheme.colors.zari,
  },
  subFiltersRow: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 6,
    alignItems: "center",
  },
  miniPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: AtelierTheme.radius.sm,
    backgroundColor: AtelierTheme.colors.silkMuted,
  },
  miniPillActive: {
    backgroundColor: AtelierTheme.colors.crimson,
  },
  miniPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: AtelierTheme.colors.ink,
  },
  miniPillTextActive: {
    color: AtelierTheme.colors.silk,
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: AtelierTheme.colors.border,
    marginHorizontal: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 28,
  },
  columnWrap: {
    gap: 12,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: AtelierTheme.colors.ink,
  },
  emptySub: {
    fontSize: 13,
    color: AtelierTheme.colors.muted,
    textAlign: "center",
  },
  resetBtn: {
    marginTop: 8,
    backgroundColor: AtelierTheme.colors.plum,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: AtelierTheme.radius.pill,
  },
  resetText: {
    color: AtelierTheme.colors.zari,
    fontWeight: "700",
    fontSize: 12,
  },
});
