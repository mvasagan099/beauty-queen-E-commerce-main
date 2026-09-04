"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store";
import { useCurrentUser, useOrders, useWishlist, useUnreadNotificationCount } from "@/hooks/use-account";
import { authApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  User,
  MapPin,
  ShoppingBag,
  Heart,
  Star,
  Bell,
  RotateCcw,
  LogOut,
  MessageSquare,
  ArrowRight,
} from "lucide-react";

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
      color: "bg-blue-100 text-blue-600",
    },
    {
      title: "Orders",
      description: `${orderCount} order${orderCount !== 1 ? "s" : ""}`,
      icon: ShoppingBag,
      href: "/account/orders",
      color: "bg-primary/10 text-primary",
    },
    {
      title: "Addresses",
      description: "Manage your delivery addresses",
      icon: MapPin,
      href: "/account/addresses",
      color: "bg-green-100 text-green-600",
    },
    {
      title: "Wishlist",
      description: `${wishlistCount} item${wishlistCount !== 1 ? "s" : ""}`,
      icon: Heart,
      href: "/wishlist",
      color: "bg-pink-100 text-pink-600",
    },
    {
      title: "My Reviews",
      description: "View and manage your reviews",
      icon: Star,
      href: "/account/reviews",
      color: "bg-yellow-100 text-yellow-600",
    },
    {
      title: "Returns",
      description: "Track and request returns",
      icon: RotateCcw,
      href: "/account/returns",
      color: "bg-orange-100 text-orange-600",
    },
    {
      title: "Notifications",
      description: `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`,
      icon: Bell,
      href: "/account/notifications",
      color: "bg-purple-100 text-purple-600",
    },
    {
      title: "Support",
      description: "Get help with your orders",
      icon: MessageSquare,
      href: "/account/support",
      color: "bg-indigo-100 text-indigo-600",
    },
  ];

  return (
    <div className="page-container max-w-4xl">
      <div className="flex items-center justify-between mb-2">
        <h1 className="page-title mb-0">My Account</h1>
        <Button
          variant="outline"
          onClick={handleLogout}
          className="gap-2 text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
      {profile && (
        <p className="text-muted-foreground mb-8">
          Welcome back, {profile.name || profile.email}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="card-hover cursor-pointer h-full group">
              <CardContent className="p-5 flex items-start gap-4">
                <div className={`rounded-xl p-3 ${section.color} transition-transform group-hover:scale-105`}>
                  <section.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">{section.title}</h3>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{section.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
