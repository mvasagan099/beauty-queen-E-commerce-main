"use client";

import { useState } from "react";
import { DashboardSidebar, sellerSidebarItems } from "@/components/layout/dashboard-sidebar";

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <DashboardSidebar
        items={sellerSidebarItems}
        title="Seller Panel"
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
      />
      <main className="flex-1 overflow-auto bg-gray-50 p-6">{children}</main>
    </div>
  );
}
