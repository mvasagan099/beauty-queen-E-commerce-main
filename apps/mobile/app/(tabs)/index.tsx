import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import {
  AtelierTheme,
  EDITORIAL_COLLECTIONS,
  formatPrice,
} from "../../src/theme/atelier";
import {
  cartApi,
  growthApi,
  productsApi,
  resolveImageUrl,
} from "../../src/lib/api";
import { useAuthStore, useGuestBagStore } from "../../src/store";
import {
  FlashSaleBanner,
  MobileProduct,
  ShopTheLookBundle,
} from "../../src/types";
import { ProductCard } from "../../src/components/ProductCard";

export default function HomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const addGuestItem = useGuestBagStore((s) => s.addItem);
  const [addingLookId, setAddingLookId] = useState<string | null>(null);

  const homepageQuery = useQuery({
    queryKey: ["homepage"],
    queryFn: () => productsApi.homepage(),
  });

  const bannerQuery = useQuery({
    queryKey: ["flash-banner"],
    queryFn: () => growthApi.banner(),
  });

  const looksQuery = useQuery({
    queryKey: ["shop-the-look"],
    queryFn: () => growthApi.looks(),
  });

  const banner: FlashSaleBanner | null = bannerQuery.data?.banner ?? null;
  const looks: ShopTheLookBundle[] = looksQuery.data?.looks ?? [];

  const featuredProducts: MobileProduct[] =
    homepageQuery.data?.newArrivals ||
    homepageQuery.data?.featured ||
    homepageQuery.data?.products ||
    [];

  const refreshing =
    homepageQuery.isRefetching ||
    bannerQuery.isRefetching ||
    looksQuery.isRefetching;

  const onRefresh = () => {
    void homepageQuery.refetch();
    void bannerQuery.refetch();
    void looksQuery.refetch();
  };

  const handleAddLook = async (bundle: ShopTheLookBundle) => {
    if (!bundle.items?.length) return;
    setAddingLookId(bundle.id);
    try {
      for (const item of bundle.items) {
        if (user) {
          await cartApi.add(item.productId, item.defaultSize || "FREE_SIZE", 1);
        } else {
          addGuestItem({
            productId: item.productId,
            name: item.name,
            price: item.price,
            image: item.image,
            size: item.defaultSize || "FREE_SIZE",
            quantity: 1,
          });
        }
      }
      if (user) {
        await queryClient.invalidateQueries({ queryKey: ["cart"] });
      }
      Alert.alert(
        "Complete Look Added",
        `${bundle.items.length} curated pieces from "${bundle.title}" added to your bag.`,
        [
          { text: "Keep Browsing", style: "cancel" },
          { text: "View Bag", onPress: () => router.push("/(tabs)/bag" as any) },
        ]
      );
    } catch (err: any) {
      Alert.alert("Could not add look", err?.message || "Please try again.");
    } finally {
      setAddingLookId(null);
    }
  };

  // Group products into pairs for 2-column grid inside ScrollView
  const productRows: MobileProduct[][] = [];
  for (let i = 0; i < featuredProducts.length; i += 2) {
    productRows.push(featuredProducts.slice(i, i + 2));
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={AtelierTheme.colors.crimson}
        />
      }
    >
      {/* Live Flash Sale Banner */}
      {banner?.active ? (
        <Pressable
          onPress={() => router.push("/(tabs)/explore" as any)}
          style={styles.flashBanner}
        >
          <View style={styles.flashPill}>
            <Text style={styles.flashPillText}>ATELIER OFFER</Text>
          </View>
          <Text style={styles.flashHeadline}>{banner.headline}</Text>
          {banner.subtext ? (
            <Text style={styles.flashSubtext}>{banner.subtext}</Text>
          ) : null}
          {banner.couponCode ? (
            <View style={styles.couponTag}>
              <Ionicons name="pricetag" size={12} color={AtelierTheme.colors.plum} />
              <Text style={styles.couponTagText}>CODE: {banner.couponCode}</Text>
            </View>
          ) : null}
        </Pressable>
      ) : null}

      {/* Editorial Hero */}
      <View style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>MADRAS SILK ATELIER · FESTIVE EDIT</Text>
        <Text style={styles.heroTitle}>Your Beauty,{"\n"}Our Priority.</Text>
        <Text style={styles.heroSubtitle}>
          Handwoven Kanjeevaram drapes, embroidered kurthis, sculpted modal leggings, and velvet-finish cosmetics delivered across India.
        </Text>
        <View style={styles.heroActions}>
          <Pressable
            onPress={() => router.push("/(tabs)/explore" as any)}
            style={({ pressed }) => [
              styles.heroPrimaryBtn,
              pressed && { opacity: 0.9 },
            ]}
          >
            <Text style={styles.heroPrimaryText}>Explore Collection</Text>
            <Ionicons name="arrow-forward" size={16} color={AtelierTheme.colors.plum} />
          </Pressable>
          {!user ? (
            <Pressable
              onPress={() => router.push("/login" as any)}
              style={({ pressed }) => [
                styles.heroGhostBtn,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.heroGhostText}>Sign In</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* 5 Editorial Collections */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionEyebrow}>CURATED RUNWAY</Text>
        <Text style={styles.sectionTitle}>Shop by Collection</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.collectionsRow}
      >
        {EDITORIAL_COLLECTIONS.map((col) => (
          <Pressable
            key={col.slug}
            onPress={() =>
              router.push({
                pathname: "/(tabs)/explore",
                params: { category: col.slug },
              } as any)
            }
            style={({ pressed }) => [
              styles.collectionCard,
              pressed && { opacity: 0.92 },
            ]}
          >
            <Image
              source={col.image}
              style={styles.collectionImage}
              resizeMode="cover"
            />
            <View style={styles.collectionOverlay}>
              <Text style={styles.collectionTitle}>{col.title}</Text>
              <Text style={styles.collectionSubtitle}>{col.subtitle}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {/* Shop the Complete Look */}
      {looks.length > 0 ? (
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEyebrow}>STYLIST ENSEMBLES</Text>
            <Text style={styles.sectionTitle}>Shop the Complete Look</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.looksRow}
          >
            {looks.map((bundle) => (
              <View key={bundle.id} style={styles.lookCard}>
                <View style={styles.lookTopRow}>
                  <View style={styles.occasionBadge}>
                    <Text style={styles.occasionText}>
                      {bundle.occasion.toUpperCase()}
                    </Text>
                  </View>
                  {bundle.discountPercent > 0 ? (
                    <Text style={styles.lookSaveText}>
                      SAVE {bundle.discountPercent}%
                    </Text>
                  ) : null}
                </View>

                <Text style={styles.lookTitle}>{bundle.title}</Text>
                <Text style={styles.lookDesc} numberOfLines={2}>
                  {bundle.description}
                </Text>

                <View style={styles.lookThumbsRow}>
                  {bundle.items.slice(0, 3).map((item) => {
                    const uri = resolveImageUrl(item.image);
                    return (
                      <Pressable
                        key={`${bundle.id}-${item.productId}`}
                        onPress={() =>
                          router.push(`/product/${item.productId}` as any)
                        }
                        style={styles.lookThumbWrap}
                      >
                        {uri ? (
                          <Image
                            source={{ uri }}
                            style={styles.lookThumb}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.lookThumbPlaceholder}>
                            <Text style={styles.lookThumbInitial}>BQ</Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.lookFooter}>
                  <View>
                    <Text style={styles.lookPrice}>
                      {formatPrice(bundle.bundlePrice)}
                    </Text>
                    {bundle.originalTotal > bundle.bundlePrice ? (
                      <Text style={styles.lookMrp}>
                        {formatPrice(bundle.originalTotal)}
                      </Text>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={() => handleAddLook(bundle)}
                    disabled={addingLookId === bundle.id}
                    style={({ pressed }) => [
                      styles.lookAddBtn,
                      pressed && { opacity: 0.9 },
                    ]}
                  >
                    {addingLookId === bundle.id ? (
                      <ActivityIndicator size="small" color={AtelierTheme.colors.silk} />
                    ) : (
                      <Text style={styles.lookAddText}>Add Look</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* New Arrivals Grid */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionEyebrow}>JUST UNVEILED</Text>
            <Text style={styles.sectionTitle}>New Arrivals</Text>
          </View>
          <Pressable onPress={() => router.push("/(tabs)/explore" as any)}>
            <Text style={styles.seeAllText}>See All</Text>
          </Pressable>
        </View>

        {homepageQuery.isLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={AtelierTheme.colors.crimson} />
            <Text style={styles.loadingText}>Curating the Atelier...</Text>
          </View>
        ) : homepageQuery.isError ? (
          <View style={styles.errorBox}>
            <Ionicons
              name="cloud-offline-outline"
              size={28}
              color={AtelierTheme.colors.crimson}
            />
            <Text style={styles.errorTitle}>Unable to reach Beauty Queen API</Text>
            <Text style={styles.errorSub}>
              Ensure apps/api is running and EXPO_PUBLIC_API_URL points to your server.
            </Text>
            <Pressable onPress={onRefresh} style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.gridWrap}>
            {productRows.map((row, idx) => (
              <View key={idx} style={styles.gridRow}>
                {row.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
                {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AtelierTheme.colors.silk,
  },
  content: {
    paddingBottom: 32,
  },
  flashBanner: {
    backgroundColor: AtelierTheme.colors.plumSoft,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 14,
    borderRadius: AtelierTheme.radius.md,
    borderWidth: 1,
    borderColor: AtelierTheme.colors.zari,
    gap: 4,
  },
  flashPill: {
    alignSelf: "flex-start",
    backgroundColor: AtelierTheme.colors.crimson,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: AtelierTheme.radius.pill,
  },
  flashPillText: {
    color: AtelierTheme.colors.silk,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  flashHeadline: {
    color: AtelierTheme.colors.silk,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 4,
  },
  flashSubtext: {
    color: "#E7D9CF",
    fontSize: 12,
    lineHeight: 17,
  },
  couponTag: {
    marginTop: 6,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: AtelierTheme.colors.zari,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: AtelierTheme.radius.pill,
  },
  couponTagText: {
    color: AtelierTheme.colors.plum,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  heroCard: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: AtelierTheme.colors.plum,
    borderRadius: AtelierTheme.radius.lg,
    padding: 22,
    gap: 10,
  },
  heroEyebrow: {
    color: AtelierTheme.colors.zari,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.6,
  },
  heroTitle: {
    color: AtelierTheme.colors.silk,
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 35,
  },
  heroSubtitle: {
    color: "#DDD0C8",
    fontSize: 13,
    lineHeight: 19,
  },
  heroActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
  },
  heroPrimaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: AtelierTheme.colors.zari,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: AtelierTheme.radius.pill,
  },
  heroPrimaryText: {
    color: AtelierTheme.colors.plum,
    fontWeight: "800",
    fontSize: 13,
  },
  heroGhostBtn: {
    borderWidth: 1,
    borderColor: AtelierTheme.colors.zari,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: AtelierTheme.radius.pill,
  },
  heroGhostText: {
    color: AtelierTheme.colors.silk,
    fontWeight: "700",
    fontSize: 13,
  },
  sectionBlock: {
    marginTop: 10,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginTop: 18,
    marginBottom: 10,
  },
  sectionHeaderRow: {
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: AtelierTheme.colors.crimson,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: AtelierTheme.colors.ink,
    marginTop: 2,
  },
  seeAllText: {
    color: AtelierTheme.colors.crimson,
    fontWeight: "700",
    fontSize: 13,
  },
  collectionsRow: {
    paddingHorizontal: 16,
    gap: 12,
  },
  collectionCard: {
    width: 148,
    height: 188,
    borderRadius: AtelierTheme.radius.md,
    overflow: "hidden",
    backgroundColor: AtelierTheme.colors.plum,
  },
  collectionImage: {
    width: "100%",
    height: "100%",
  },
  collectionOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 10,
    backgroundColor: "rgba(26, 11, 16, 0.72)",
  },
  collectionTitle: {
    color: AtelierTheme.colors.silk,
    fontSize: 15,
    fontWeight: "800",
  },
  collectionSubtitle: {
    color: AtelierTheme.colors.zariSoft,
    fontSize: 11,
    marginTop: 2,
  },
  looksRow: {
    paddingHorizontal: 16,
    gap: 12,
  },
  lookCard: {
    width: 274,
    backgroundColor: AtelierTheme.colors.silkCard,
    borderRadius: AtelierTheme.radius.md,
    borderWidth: 1,
    borderColor: AtelierTheme.colors.border,
    padding: 14,
    gap: 8,
  },
  lookTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  occasionBadge: {
    backgroundColor: AtelierTheme.colors.zariSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: AtelierTheme.radius.pill,
  },
  occasionText: {
    color: AtelierTheme.colors.plum,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  lookSaveText: {
    color: AtelierTheme.colors.crimson,
    fontSize: 11,
    fontWeight: "800",
  },
  lookTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: AtelierTheme.colors.ink,
  },
  lookDesc: {
    fontSize: 12,
    color: AtelierTheme.colors.muted,
    lineHeight: 17,
  },
  lookThumbsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
  },
  lookThumbWrap: {
    width: 72,
    height: 82,
    borderRadius: AtelierTheme.radius.sm,
    overflow: "hidden",
    backgroundColor: AtelierTheme.colors.silkMuted,
  },
  lookThumb: {
    width: "100%",
    height: "100%",
  },
  lookThumbPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AtelierTheme.colors.plum,
  },
  lookThumbInitial: {
    color: AtelierTheme.colors.zari,
    fontWeight: "800",
  },
  lookFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: AtelierTheme.colors.border,
  },
  lookPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: AtelierTheme.colors.crimson,
  },
  lookMrp: {
    fontSize: 11,
    color: AtelierTheme.colors.muted,
    textDecorationLine: "line-through",
  },
  lookAddBtn: {
    backgroundColor: AtelierTheme.colors.crimson,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: AtelierTheme.radius.pill,
    minWidth: 92,
    alignItems: "center",
  },
  lookAddText: {
    color: AtelierTheme.colors.silk,
    fontSize: 12,
    fontWeight: "700",
  },
  gridWrap: {
    paddingHorizontal: 16,
  },
  gridRow: {
    flexDirection: "row",
    gap: 12,
  },
  centerBox: {
    padding: 36,
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    color: AtelierTheme.colors.muted,
    fontSize: 13,
  },
  errorBox: {
    marginHorizontal: 16,
    padding: 20,
    borderRadius: AtelierTheme.radius.md,
    backgroundColor: AtelierTheme.colors.silkCard,
    borderWidth: 1,
    borderColor: AtelierTheme.colors.border,
    alignItems: "center",
    gap: 8,
  },
  errorTitle: {
    fontWeight: "700",
    color: AtelierTheme.colors.ink,
    fontSize: 15,
  },
  errorSub: {
    color: AtelierTheme.colors.muted,
    fontSize: 12,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 6,
    backgroundColor: AtelierTheme.colors.crimson,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: AtelierTheme.radius.pill,
  },
  retryText: {
    color: AtelierTheme.colors.silk,
    fontWeight: "700",
    fontSize: 13,
  },
});
