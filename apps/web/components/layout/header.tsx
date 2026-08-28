"use client";

import Link from "next/link";
import { useAuthStore } from "@/store";
import { useQuery } from "@tanstack/react-query";
import { authApi, getSellerToken, cartApi, sellersApi } from "@/lib/api";
import { ShoppingCart, Menu, User, LogOut, Store, LayoutDashboard, Heart } from "lucide-react";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MobileMenu } from "./mobile-menu";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { SearchBar } from "@/components/product/search-bar";

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
  const router = useRouter();
  const pathname = usePathname();

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

  const handleSellerLogout = async () => {
    try {
      await sellersApi.logout();
    } finally {
      setSellerLoggedIn(false);
      router.push("/");
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
      logout();
      router.push("/");
    } catch {
      logout();
      router.push("/");
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-white shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between gap-2">
            <Link href="/" className="text-xl font-bold text-pink-500 flex-shrink-0">
              Beauty Queen
            </Link>

            <nav className="hidden lg:flex items-center gap-6" aria-label="Main navigation">
              {categories.map((cat) => (
                <Link
                  key={cat.href}
                  href={cat.href}
                  className="text-sm font-medium text-gray-700 hover:text-pink-500 transition-colors"
                >
                  {cat.name}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <SearchBar className="hidden md:block w-48 lg:w-64" placeholder="Search products..." />

              <Link
                href="/cart"
                className="relative text-gray-700 hover:text-pink-500 p-1"
                aria-label={`Shopping cart${cartCount > 0 ? `, ${cartCount} items` : ""}`}
              >
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-pink-500 text-[10px] font-medium text-white">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </Link>

              {user && (
                <>
                  <Link
                    href="/wishlist"
                    className="text-gray-700 hover:text-pink-500 p-1"
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
                    className="hidden sm:flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-pink-500"
                    title="Seller Dashboard"
                  >
                    <LayoutDashboard className="h-5 w-5" />
                    <span className="hidden lg:inline">Seller</span>
                  </Link>
                  <button
                    onClick={handleSellerLogout}
                    className="text-gray-700 hover:text-pink-500"
                    aria-label="Seller logout"
                    title="Seller logout"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </>
              ) : user ? (
                <div className="hidden sm:flex items-center gap-2">
                  {user.role === "ADMIN" && (
                    <Link
                      href="/admin/dashboard"
                      className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-pink-500"
                      title="Admin Dashboard"
                    >
                      <LayoutDashboard className="h-5 w-5" />
                    </Link>
                  )}
                  <span className="hidden lg:inline text-sm text-gray-600 max-w-[120px] truncate">
                    {user.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-gray-700 hover:text-pink-500"
                    aria-label="Logout"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-2">
                  <Link
                    href="/seller/login"
                    className="flex items-center gap-1 text-sm text-gray-600 hover:text-pink-500"
                    title="Seller Login"
                  >
                    <Store className="h-4 w-4" />
                    <span className="hidden lg:inline">Seller</span>
                  </Link>
                  <Link
                    href="/login"
                    className="text-gray-700 hover:text-pink-500"
                    aria-label="Login"
                  >
                    <User className="h-5 w-5" />
                  </Link>
                </div>
              )}

              <button
                className="lg:hidden p-1"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open menu"
                aria-expanded={mobileMenuOpen}
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>

          <SearchBar className="md:hidden block pb-3" placeholder="Search products..." />
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
