"use client";

const STORAGE_KEY = "recently-viewed-products";
const MAX_ITEMS = 8;

export interface RecentlyViewedEntry {
  productId: number;
  viewedAt: number;
}

export function getRecentlyViewed(): RecentlyViewedEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentlyViewedEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordRecentlyViewed(productId: number) {
  if (typeof window === "undefined" || !productId) return;
  try {
    const entries = getRecentlyViewed().filter((e) => e.productId !== productId);
    entries.unshift({ productId, viewedAt: Date.now() });
    const trimmed = entries.slice(0, MAX_ITEMS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage unavailable - non-critical browsing history
  }
}

export function clearRecentlyViewed() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
