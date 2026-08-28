"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store";
import { useCurrentUser, useOrders, useWishlist, useUnreadNotificationCount } from "@/hooks/use-account";
import { authApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, MapPin, ShoppingBag, Heart, Star, Bell, RotateCcw, LogOut, MessageSquare } from "lucide-react";

export default function AccountPage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const { data: profileData } = useCurrentUser();
  const { data: ordersData } = useOrders();
  const { data: wishlistData } = useWishlist();
  const { data: unreadData } = useUnreadNotificationCount();

  const profile = profileData?.user || user;
  const orderCount = Array.isArray(ordersData?.orders) ? ordersData.orders.length : 0;
  const wishlistCount = wishlistData?.count || 0;
  const unreadCount = unreadData?.count || 0;

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      logout();
      router.push("/");
    }
  };

  const sections = [
    {
      title: "Profile",
      description: "Manage your personal information",
      icon: User,
      href: "/account/profile",
    },
    {
      title: "Orders",
      description: `${orderCount} order${orderCount !== 1 ? "s" : ""}`,
      icon: ShoppingBag,
      href: "/account/orders",
    },
    {
      title: "Addresses",
      description: "Manage your delivery addresses",
      icon: MapPin,
      href: "/account/addresses",
    },
    {
      title: "Wishlist",
      description: `${wishlistCount} item${wishlistCount !== 1 ? "s" : ""}`,
      icon: Heart,
      href: "/wishlist",
    },
    {
      title: "My Reviews",
      description: "View and manage your reviews",
      icon: Star,
      href: "/account/reviews",
    },
    {
      title: "Returns",
      description: "Track and request returns",
      icon: RotateCcw,
      href: "/account/returns",
    },
    {
      title: "Notifications",
      description: `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`,
      icon: Bell,
      href: "/account/notifications",
    },
    {
      title: "Support",
      description: "Get help with your orders",
      icon: MessageSquare,
      href: "/account/support",
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold text-gray-900">My Account</h1>
        <Button
          variant="outline"
          onClick={handleLogout}
          className="flex items-center gap-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
      {profile && (
        <p className="text-gray-500 mb-8">
          Welcome back, {profile.name || profile.email}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {sections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardContent className="p-6 flex items-start gap-4">
                <div className="rounded-lg bg-pink-50 p-3">
                  <section.icon className="h-6 w-6 text-pink-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{section.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{section.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
