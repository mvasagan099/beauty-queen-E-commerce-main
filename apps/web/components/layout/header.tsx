"use client";

import Link from "next/link";
import { useAuthStore } from "@/store";
import { useQuery } from "@tanstack/react-query";
import { authApi, getSellerToken, cartApi, sellersApi } from "@/lib/api";
import {
  ShoppingCart,
  Menu,
  User,
  LogOut,
  Store,
  LayoutDashboard,
  Heart,
  Search,
  X,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MobileMenu } from "./mobile-menu";
import { NotificationBell } from "@/components/notifications/notification-bell";

const categories = [
  { name: "Saree", href: "/saree" },
  { name: "Kurthi", href: "/kurthi" },
  { name: "Top", href: "/top" },
  { name: "Leggin", href: "/leggin" },
  { name: "Cosmetics", href: "/cosmetics" },
];

export default function Header() {
  const { user, setUser, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sellerLoggedIn, setSellerLoggedIn] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [desktopSearchQuery, setDesktopSearchQuery] = useState("");
  const [mobileSearchQuery, setMobileSearchQuery] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const desktopSearchRef = useRef<HTMLInputElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  const { data: userData } = useQuery({
    queryKey: ["auth-me"],
    queryFn: () => authApi.me(),
    retry: false,
    enabled: !user,
  });

  const { data: cartResponse } = useQuery({
    queryKey: ["cart"],
    queryFn: () => cartApi.get(),
    enabled: !!user,
  });

  const cartCount = cartResponse?.data?.itemCount || 0;

  useEffect(() => {
    if (userData?.user) {
      setUser(userData.user);
    }
  }, [userData, setUser]);

  useEffect(() => {
    const syncSellerState = () => setSellerLoggedIn(!!getSellerToken());
    syncSellerState();
    window.addEventListener("storage", syncSellerState);
    return () => window.removeEventListener("storage", syncSellerState);
  }, [pathname]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setMobileSearchOpen(false);
  }, [pathname]);

  const handleSellerLogout = useCallback(async () => {
    try {
      await sellersApi.logout();
    } finally {
      setSellerLoggedIn(false);
      router.push("/");
    }
  }, [router]);

  const handleLogout = useCallback(async () => {
    try {
      await authApi.logout();
      logout();
      router.push("/");
    } catch {
      logout();
      router.push("/");
    }
  }, [logout, router]);

  const handleDesktopSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = desktopSearchQuery.trim();
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
      setDesktopSearchQuery("");
      desktopSearchRef.current?.blur();
    }
  };

  const handleMobileSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = mobileSearchQuery.trim();
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
      setMobileSearchQuery("");
      setMobileSearchOpen(false);
    }
  };

  const isActiveCategory = (href: string) => pathname === href;

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-sm">
        <div className="container-page">
          <div className="flex h-16 items-center justify-between gap-2">
            <Link
              href="/"
              className="text-xl font-bold text-primary flex-shrink-0 tracking-tight"
              aria-label="Beauty Queen - Home"
            >
              Beauty Queen
            </Link>

            <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
              {categories.map((cat) => (
                <Link
                  key={cat.href}
                  href={cat.href}
                  className={`relative px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActiveCategory(cat.href)
                      ? "text-primary bg-primary/5"
                      : "text-gray-600 hover:text-primary hover:bg-gray-50"
                  }`}
                  aria-current={isActiveCategory(cat.href) ? "page" : undefined}
                >
                  {cat.name}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-1 sm:gap-2">
              <form
                onSubmit={handleDesktopSearch}
                className="hidden md:flex items-center"
              >
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    ref={desktopSearchRef}
                    type="search"
                    placeholder="Search products..."
                    value={desktopSearchQuery}
                    onChange={(e) => setDesktopSearchQuery(e.target.value)}
                    className="h-9 w-48 lg:w-64 rounded-md border border-input bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label="Search products"
                  />
                </div>
              </form>

              <button
                className="md:hidden p-2 rounded-md hover:bg-gray-100 transition-colors"
                onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
                aria-label={mobileSearchOpen ? "Close search" : "Open search"}
                aria-expanded={mobileSearchOpen}
              >
                {mobileSearchOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Search className="h-5 w-5" />
                )}
              </button>

              <Link
                href="/cart"
                className="relative p-2 rounded-md text-gray-600 hover:text-primary hover:bg-gray-100 transition-colors"
                aria-label={`Shopping cart${cartCount > 0 ? `, ${cartCount} items` : ""}`}
              >
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground min-w-[20px]">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </Link>

              {user && (
                <>
                  <Link
                    href="/wishlist"
                    className="hidden sm:flex p-2 rounded-md text-gray-600 hover:text-primary hover:bg-gray-100 transition-colors"
                    aria-label="Wishlist"
                    title="Wishlist"
                  >
                    <Heart className="h-5 w-5" />
                  </Link>
                  <NotificationBell />
                </>
              )}

              {sellerLoggedIn ? (
                <>
                  <Link
                    href="/seller/dashboard"
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:text-primary hover:bg-gray-100 transition-colors"
                    title="Seller Dashboard"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span className="hidden lg:inline">Seller</span>
                  </Link>
                  <button
                    onClick={handleSellerLogout}
                    className="p-2 rounded-md text-gray-600 hover:text-primary hover:bg-gray-100 transition-colors"
                    aria-label="Seller logout"
                    title="Seller logout"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </>
              ) : user ? (
                <div className="hidden sm:flex items-center gap-1">
                  {user.role === "ADMIN" && (
                    <Link
                      href="/admin/dashboard"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:text-primary hover:bg-gray-100 transition-colors"
                      title="Admin Dashboard"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                    </Link>
                  )}
                  <span className="hidden lg:inline text-sm text-muted-foreground max-w-[120px] truncate">
                    {user.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-md text-gray-600 hover:text-primary hover:bg-gray-100 transition-colors"
                    aria-label="Logout"
                    title="Logout"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-1">
                  <Link
                    href="/seller/login"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-primary hover:bg-gray-100 transition-colors"
                    title="Seller Login"
                  >
                    <Store className="h-4 w-4" />
                    <span className="hidden lg:inline">Seller</span>
                  </Link>
                  <Link
                    href="/login"
                    className="p-2 rounded-md text-gray-600 hover:text-primary hover:bg-gray-100 transition-colors"
                    aria-label="Login"
                    title="Login"
                  >
                    <User className="h-5 w-5" />
                  </Link>
                </div>
              )}

              <button
                className="lg:hidden p-2 rounded-md hover:bg-gray-100 transition-colors"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open navigation menu"
                aria-expanded={mobileMenuOpen}
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>

          {mobileSearchOpen && (
            <form onSubmit={handleMobileSearch} className="md:hidden pb-3 animate-slide-up">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  ref={mobileSearchRef}
                  type="search"
                  placeholder="Search products..."
                  value={mobileSearchQuery}
                  onChange={(e) => setMobileSearchQuery(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label="Search products"
                  autoFocus
                />
              </div>
            </form>
          )}
        </div>
      </header>

      <MobileMenu
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        user={user}
        sellerLoggedIn={sellerLoggedIn}
        onLogout={handleLogout}
        onSellerLogout={handleSellerLogout}
      />
    </>
  );
}
