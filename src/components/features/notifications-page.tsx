"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowRightLeft,
  AlertTriangle,
  Trophy,
  TrendingUp,
  Clock,
  CalendarCheck,
  Gift,
  Calendar,
  BarChart3,
  Bell,
  CheckSquare,
  CheckCheck,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { notificationStyles, notificationStyleDefault, spacing, typography, iconSize } from "@/lib/design-tokens";
import { apiFetch } from "@/lib/api-client";

// ─── Notification types & helpers ────────────────────────────────────────────

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  actionUrl?: string | null;
}

function getNotificationStyle(type: string) {
  return notificationStyles[type] ?? notificationStyleDefault;
}

function getNotificationIcon(type: string) {
  const style = getNotificationStyle(type);
  switch (type) {
    case "TRANSFER_REQUEST":
    case "TRANSFER_ACCEPTED":
    case "TRANSFER_REJECTED":
      return <ArrowRightLeft className={cn(iconSize.md, style.iconColor)} />;
    case "TASK_OVERDUE":
      return <AlertTriangle className={cn(iconSize.md, style.iconColor)} />;
    case "ACHIEVEMENT_UNLOCKED":
      return <Trophy className={cn(iconSize.md, style.iconColor)} />;
    case "LEVEL_UP":
      return <TrendingUp className={cn(iconSize.md, style.iconColor)} />;
    case "REMINDER_DUE":
      return <Clock className={cn(iconSize.md, style.iconColor)} />;
    case "PLAN_READY":
    case "PLAN_APPLIED":
      return <CalendarCheck className={cn(iconSize.md, style.iconColor)} />;
    case "REWARD_REDEEMED":
      return <Gift className={cn(iconSize.md, style.iconColor)} />;
    case "SERVICE_DUE_SOON":
      return <Calendar className={cn(iconSize.md, style.iconColor)} />;
    case "EXPENSE_WEEKLY_SUMMARY":
      return <BarChart3 className={cn(iconSize.md, style.iconColor)} />;
    case "TASK_REMINDER":
      return <CheckSquare className={cn(iconSize.md, style.iconColor)} />;
    default:
      return <Bell className={iconSize.md} />;
  }
}

function formatNotificationTime(dateString: string): string {
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const timeStr = past.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });

  if (diffMins < 1) return "ahora";
  if (diffMins < 60) return `hace ${diffMins} min`;
  if (diffHours < 24) return `hoy ${timeStr}`;
  if (diffDays === 1) return `ayer ${timeStr}`;
  if (diffDays < 7) {
    const dayName = past.toLocaleDateString("es", { weekday: "long" });
    return `${dayName} ${timeStr}`;
  }
  return past.toLocaleDateString("es", { day: "numeric", month: "short" }) + ` ${timeStr}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

type FilterMode = "all" | "unread";

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [isMarking, setIsMarking] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const url = filter === "unread"
        ? "/api/notifications?unreadOnly=true"
        : "/api/notifications";
      const data = await apiFetch<{
        notifications: Notification[];
        unreadCount: number;
      }>(url);
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setIsLoading(true);
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAllAsRead = async () => {
    setIsMarking(true);
    try {
      await apiFetch("/api/notifications", {
        method: "PATCH",
        body: { all: true },
      });
      setUnreadCount(0);
      setNotifications((prev) =>
        prev.map((n) => (n.isRead ? n : { ...n, isRead: true }))
      );
    } catch {
      // Silently fail
    } finally {
      setIsMarking(false);
    }
  };

  const displayed = notifications;

  return (
    <>
      <PageHeader
        backButton
        icon={Bell}
        title="Notificaciones"
        actions={
          unreadCount > 0 ? (
            <>
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => void markAllAsRead()}
                disabled={isMarking}
              >
                {isMarking ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCheck className="h-3.5 w-3.5" />
                )}
                Marcar todo como leído
              </Button>
            </>
          ) : undefined
        }
      />

      {/* Filter tabs */}
      <div className="mb-6 flex items-center rounded-lg border bg-muted p-0.5 w-fit">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setFilter("all")}
          className={cn(
            "h-8 rounded-md px-3",
            filter === "all" && "bg-background shadow-sm"
          )}
        >
          Todas
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setFilter("unread")}
          className={cn(
            "h-8 rounded-md px-3",
            filter === "unread" && "bg-background shadow-sm"
          )}
        >
          Sin leer
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : displayed.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={filter === "unread"
            ? "No tenés notificaciones sin leer"
            : "No tenés notificaciones"}
        />
      ) : (
        <div className="space-y-2">
          {displayed.map((notification) => {
            const style = getNotificationStyle(notification.type);
            const isUnread = !notification.isRead;
            const card = (
              <div
                className={cn(
                  "rounded-2xl p-4 transition-colors",
                  style.bg,
                  isUnread && "border-l-[3px] border-l-primary"
                )}
              >
                <div className="flex gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/60 dark:bg-white/10">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{notification.title}</p>
                      {isUnread && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {notification.message}
                    </p>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {formatNotificationTime(notification.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            );

            return notification.actionUrl ? (
              <Link key={notification.id} href={notification.actionUrl} className="block">
                {card}
              </Link>
            ) : (
              <div key={notification.id}>{card}</div>
            );
          })}
        </div>
      )}
    </>
  );
}
