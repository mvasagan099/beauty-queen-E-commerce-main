"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/hooks/use-account";
import { notificationsApi } from "@/lib/api";
import { NotificationItem } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Bell, BellRing, CheckCheck, Settings2 } from "lucide-react";

const PAGE_SIZE = 20;

interface NotificationPreferences {
  orderUpdates: boolean;
  paymentUpdates: boolean;
  promotional: boolean;
}

const PREFERENCE_ITEMS: { key: keyof NotificationPreferences; label: string; description: string }[] = [
  { key: "orderUpdates", label: "Order updates", description: "Order status, shipping and delivery emails" },
  { key: "paymentUpdates", label: "Payment updates", description: "Payment confirmations and failure alerts" },
  { key: "promotional", label: "Promotional emails", description: "Offers, launches and abandoned-cart reminders" },
];

export default function AccountNotificationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useNotifications(page, PAGE_SIZE);
  const { data: unreadData } = useUnreadNotificationCount();
  const markAsReadMutation = useMarkNotificationRead();
  const markAllAsReadMutation = useMarkAllNotificationsRead();

  const { data: prefsData } = useQuery<{ success: boolean; preferences: NotificationPreferences }>({
    queryKey: ["notification-preferences"],
    queryFn: () => notificationsApi.getPreferences(),
  });

  const prefsMutation = useMutation({
    mutationFn: (patch: Partial<NotificationPreferences>) =>
      notificationsApi.updatePreferences(patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      toast.success("Notification preferences updated");
    },
    onError: (err: Error) => toast.error(err.message || "Could not update preferences"),
  });

  const preferences = prefsData?.preferences;

  const notifications = data?.notifications || [];
  const totalPages = data?.pagination?.totalPages || 1;
  const unreadCount = unreadData?.count || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
      </div>
    );
  }

  const handleMarkRead = (notification: NotificationItem) => {
    if (notification.readAt) return;
    markAsReadMutation.mutate(notification.id, {
      onSuccess: () => toast.success("Notification marked as read"),
      onError: (err: Error) => toast.error(err.message),
    });
  };

  const handleMarkAllRead = () => {
    if (unreadCount === 0) return;
    markAllAsReadMutation.mutate(undefined, {
      onSuccess: () => toast.success("All notifications marked as read"),
      onError: (err: Error) => toast.error(err.message),
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            className="text-pink-500 border-pink-500 hover:bg-pink-50"
            onClick={handleMarkAllRead}
            disabled={markAllAsReadMutation.isPending}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all read
          </Button>
        )}
      </div>

      <div className="mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-lg bg-pink-50 p-2">
                <Settings2 className="h-5 w-5 text-pink-500" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Email Preferences</h2>
                <p className="text-sm text-gray-500">
                  Choose which emails you want to receive from us.
                </p>
              </div>
            </div>
            {preferences ? (
              <div className="space-y-3">
                {PREFERENCE_ITEMS.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.description}</p>
                    </div>
                    <button
                      role="switch"
                      aria-checked={preferences[item.key]}
                      aria-label={`Toggle ${item.label}`}
                      onClick={() =>
                        prefsMutation.mutate({ [item.key]: !preferences[item.key] })
                      }
                      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                        preferences[item.key] ? "bg-pink-500" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                          preferences[item.key] ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Loading preferences...</p>
            )}
          </CardContent>
        </Card>
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-4 min-h-[40vh] justify-center">
          <Bell className="h-12 w-12 text-gray-300" />
          <p className="text-gray-500">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`transition-colors ${
                notification.readAt ? "" : "border-pink-200"
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`rounded-lg p-2 ${
                      notification.readAt ? "bg-gray-100" : "bg-pink-50"
                    }`}
                  >
                    {notification.readAt ? (
                      <Bell className="h-5 w-5 text-gray-400" />
                    ) : (
                      <BellRing className="h-5 w-5 text-pink-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3
                        className={`text-sm text-gray-900 ${
                          notification.readAt ? "" : "font-semibold"
                        }`}
                      >
                        {notification.title}
                      </h3>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-gray-400">
                          {new Date(notification.createdAt).toLocaleString("en-IN")}
                        </span>
                        {!notification.readAt && (
                          <button
                            onClick={() => handleMarkRead(notification)}
                            className="text-xs font-medium text-pink-500 hover:text-pink-700 underline"
                            aria-label={`Mark "${notification.title}" as read`}
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
