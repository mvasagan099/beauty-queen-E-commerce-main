"use client";

import Link from "next/link";
import { X, ShoppingCart, User, Store, LayoutDashboard, Heart, LogOut } from "lucide-react";
import { useEffect, useRef } from "react";

const categories = [
  { name: "Saree", href: "/saree" },
  { name: "Kurthi", href: "/kurthi" },
  { name: "Top", href: "/top" },
  { name: "Leggin", href: "/leggin" },
  { name: "Cosmetics", href: "/cosmetics" },
];

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
  user: { email: string; role: string } | null;
  sellerLoggedIn: boolean;
  onLogout: () => void;
  onSellerLogout: () => void;
}

export function MobileMenu({
  open,
  onClose,
  user,
  sellerLoggedIn,
  onLogout,
  onSellerLogout,
}: MobileMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div
        ref={menuRef}
        className="fixed inset-y-0 right-0 w-80 max-w-[85vw] bg-white shadow-xl overflow-y-auto"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <span className="text-lg font-bold text-pink-500">Menu</span>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {categories.map((cat) => (
            <Link
              key={cat.href}
              href={cat.href}
              className="block py-3 px-3 rounded-md text-sm font-medium text-gray-700 hover:bg-pink-50 hover:text-pink-500 transition-colors"
              onClick={onClose}
            >
              {cat.name}
            </Link>
          ))}
        </nav>

        <div className="border-t p-4 space-y-1">
          <Link
            href="/cart"
            className="flex items-center gap-3 py-3 px-3 rounded-md text-sm font-medium text-gray-700 hover:bg-pink-50 hover:text-pink-500 transition-colors"
            onClick={onClose}
          >
            <ShoppingCart className="h-4 w-4" />
            Cart
          </Link>

          {sellerLoggedIn ? (
            <>
              <Link
                href="/seller/dashboard"
                className="flex items-center gap-3 py-3 px-3 rounded-md text-sm font-medium text-pink-500 bg-pink-50"
                onClick={onClose}
              >
                <LayoutDashboard className="h-4 w-4" />
                Seller Dashboard
              </Link>
              <button
                onClick={() => {
                  onSellerLogout();
                  onClose();
                }}
                className="flex items-center gap-3 py-3 px-3 rounded-md text-sm font-medium text-gray-700 hover:bg-pink-50 hover:text-pink-500 transition-colors w-full text-left"
              >
                <LogOut className="h-4 w-4" />
                Seller Logout
              </button>
            </>
          ) : user ? (
            <>
              {user.role === "ADMIN" && (
                <Link
                  href="/admin/dashboard"
                  className="flex items-center gap-3 py-3 px-3 rounded-md text-sm font-medium text-gray-700 hover:bg-pink-50 hover:text-pink-500 transition-colors"
                  onClick={onClose}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Admin Dashboard
                </Link>
              )}
              <Link
                href="/account"
                className="flex items-center gap-3 py-3 px-3 rounded-md text-sm font-medium text-gray-700 hover:bg-pink-50 hover:text-pink-500 transition-colors"
                onClick={onClose}
              >
                <User className="h-4 w-4" />
                My Account
              </Link>
              <Link
                href="/wishlist"
                className="flex items-center gap-3 py-3 px-3 rounded-md text-sm font-medium text-gray-700 hover:bg-pink-50 hover:text-pink-500 transition-colors"
                onClick={onClose}
              >
                <Heart className="h-4 w-4" />
                Wishlist
              </Link>
              <Link
                href="/orders"
                className="flex items-center gap-3 py-3 px-3 rounded-md text-sm font-medium text-gray-700 hover:bg-pink-50 hover:text-pink-500 transition-colors"
                onClick={onClose}
              >
                My Orders
              </Link>
              <button
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="flex items-center gap-3 py-3 px-3 rounded-md text-sm font-medium text-gray-700 hover:bg-pink-50 hover:text-pink-500 transition-colors w-full text-left"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/seller/login"
                className="flex items-center gap-3 py-3 px-3 rounded-md text-sm font-medium text-gray-700 hover:bg-pink-50 hover:text-pink-500 transition-colors"
                onClick={onClose}
              >
                <Store className="h-4 w-4" />
                Seller Login
              </Link>
              <Link
                href="/login"
                className="flex items-center gap-3 py-3 px-3 rounded-md text-sm font-medium text-gray-700 hover:bg-pink-50 hover:text-pink-500 transition-colors"
                onClick={onClose}
              >
                <User className="h-4 w-4" />
                Login / Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
