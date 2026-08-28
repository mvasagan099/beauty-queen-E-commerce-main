"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Store,
  ChevronLeft,
  Tag,
  RotateCcw,
  CreditCard,
  Boxes,
  BarChart3,
  Plus,
  User,
  ScrollText,
  LifeBuoy,
} from "lucide-react";

export interface SidebarItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface DashboardSidebarProps {
  items: SidebarItem[];
  title: string;
  collapsed?: boolean;
  onToggle?: () => void;
}

export function DashboardSidebar({
  items,
  title,
  collapsed = false,
  onToggle,
}: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-white transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className="flex h-14 items-center justify-between border-b px-4">
        {!collapsed && (
          <span className="text-sm font-bold text-pink-500 truncate">{title}</span>
        )}
        <button
          onClick={onToggle}
          className="rounded p-1 hover:bg-gray-100"
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform",
              collapsed && "rotate-180"
            )}
          />
        </button>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-pink-50 text-pink-600"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
              title={collapsed ? item.label : undefined}
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-2">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          title={collapsed ? "Back to Store" : undefined}
        >
          <Store className="h-4 w-4" />
          {!collapsed && <span>Back to Store</span>}
        </Link>
      </div>
    </aside>
  );
}

export const sellerSidebarItems: SidebarItem[] = [
  {
    label: "Dashboard",
    href: "/seller/dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    label: "Products",
    href: "/seller/products",
    icon: <Package className="h-4 w-4" />,
  },
  {
    label: "Add Product",
    href: "/seller/add-product",
    icon: <Plus className="h-4 w-4" />,
  },
  {
    label: "Orders",
    href: "/seller/orders",
    icon: <ShoppingCart className="h-4 w-4" />,
  },
  {
    label: "Inventory",
    href: "/seller/inventory",
    icon: <Boxes className="h-4 w-4" />,
  },
  {
    label: "Profile",
    href: "/seller/profile",
    icon: <User className="h-4 w-4" />,
  },
];

export const adminSidebarItems: SidebarItem[] = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    label: "Analytics",
    href: "/admin/analytics",
    icon: <BarChart3 className="h-4 w-4" />,
  },
  {
    label: "Products",
    href: "/admin/products",
    icon: <Package className="h-4 w-4" />,
  },
  {
    label: "Orders",
    href: "/admin/orders",
    icon: <ShoppingCart className="h-4 w-4" />,
  },
  {
    label: "Coupons",
    href: "/admin/coupons",
    icon: <Tag className="h-4 w-4" />,
  },
  {
    label: "Returns",
    href: "/admin/returns",
    icon: <RotateCcw className="h-4 w-4" />,
  },
  {
    label: "Refunds",
    href: "/admin/refunds",
    icon: <CreditCard className="h-4 w-4" />,
  },
  {
    label: "Users",
    href: "/admin/users",
    icon: <Users className="h-4 w-4" />,
  },
  {
    label: "Sellers",
    href: "/admin/sellers",
    icon: <Store className="h-4 w-4" />,
  },
  {
    label: "Audit Logs",
    href: "/admin/audit-logs",
    icon: <ScrollText className="h-4 w-4" />,
  },
  {
    label: "Support",
    href: "/admin/support",
    icon: <LifeBuoy className="h-4 w-4" />,
  },
];
