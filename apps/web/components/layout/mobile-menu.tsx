"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  X,
  ShoppingCart,
  User,
  Store,
  LayoutDashboard,
  Heart,
  LogOut,
  Package,
  ChevronRight,
} from "lucide-react";
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
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      setTimeout(() => closeButtonRef.current?.focus(), 100);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && menuRef.current) {
        const focusable = menuRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  if (!open) return null;

  const isActive = (href: string) => pathname === href;

  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
      <div
        className="fixed inset-0 bg-black/50 transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={menuRef}
        className="fixed inset-y-0 right-0 w-80 max-w-[85vw] bg-white shadow-xl overflow-y-auto animate-slide-in-right"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <span className="text-lg font-bold text-primary">Menu</span>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="p-4 space-y-1" aria-label="Mobile navigation">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 pb-2">
            Categories
          </p>
          {categories.map((cat) => (
            <Link
              key={cat.href}
              href={cat.href}
              className={`flex items-center justify-between py-3 px-3 rounded-lg text-sm font-medium transition-colors ${
                isActive(cat.href)
                  ? "bg-primary/5 text-primary"
                  : "text-gray-700 hover:bg-gray-50 hover:text-primary"
              }`}
              onClick={onClose}
              aria-current={isActive(cat.href) ? "page" : undefined}
            >
              <span>{cat.name}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </nav>

        <div className="border-t p-4 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 pb-2">
            Account
          </p>
          <Link
            href="/cart"
            className="flex items-center gap-3 py-3 px-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
            onClick={onClose}
          >
            <ShoppingCart className="h-4 w-4" />
            Cart
          </Link>

          {sellerLoggedIn ? (
            <>
              <Link
                href="/seller/dashboard"
                className="flex items-center gap-3 py-3 px-3 rounded-lg text-sm font-medium text-primary bg-primary/5"
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
                className="flex items-center gap-3 py-3 px-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors w-full text-left"
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
                  className="flex items-center gap-3 py-3 px-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
                  onClick={onClose}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Admin Dashboard
                </Link>
              )}
              <Link
                href="/account"
                className="flex items-center gap-3 py-3 px-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
                onClick={onClose}
              >
                <User className="h-4 w-4" />
                My Account
              </Link>
              <Link
                href="/wishlist"
                className="flex items-center gap-3 py-3 px-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
                onClick={onClose}
              >
                <Heart className="h-4 w-4" />
                Wishlist
              </Link>
              <Link
                href="/orders"
                className="flex items-center gap-3 py-3 px-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
                onClick={onClose}
              >
                <Package className="h-4 w-4" />
                My Orders
              </Link>
              <button
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="flex items-center gap-3 py-3 px-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors w-full text-left"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/seller/login"
                className="flex items-center gap-3 py-3 px-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
                onClick={onClose}
              >
                <Store className="h-4 w-4" />
                Seller Login
              </Link>
              <Link
                href="/login"
                className="flex items-center gap-3 py-3 px-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
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
