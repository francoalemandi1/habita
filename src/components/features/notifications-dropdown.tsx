"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  ArrowRightLeft,
  AlertTriangle,
  Trophy,
  TrendingUp,
  Clock,
  CalendarCheck,
  Gift,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { notificationStyles, notificationStyleDefault, spacing, iconSize } from "@/lib/design-tokens";

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

export function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const markingAsReadRef = useRef(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications");
      if (response.ok) {
        const data = (await response.json()) as {
          notifications: Notification[];
          unreadCount: number;
        };
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Mark all as read when dialog opens (server-side)
  useEffect(() => {
    if (!open || unreadCount === 0 || markingAsReadRef.current) return;

    markingAsReadRef.current = true;

    fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    })
      .then((res) => {
        if (res.ok) {
          setUnreadCount(0);
          setNotifications((prev) =>
            prev.map((n) => (n.isRead ? n : { ...n, isRead: true }))
          );
        }
      })
      .catch(() => {
        // Silently fail — will retry next time
      })
      .finally(() => {
        markingAsReadRef.current = false;
      });
  }, [open, unreadCount]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className={iconSize.md} />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] w-[calc(100%-2rem)] min-w-0 overflow-hidden p-0 md:min-w-[380px]">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <Bell className={iconSize.lg} />
            Notificaciones
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto px-5 pb-5">
          {isLoading ? (
            <p className="py-8 text-center text-muted-foreground">Cargando...</p>
          ) : notifications.length === 0 ? (
            <div className="py-10 text-center">
              <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-muted/50">
                <Bell className={`${iconSize.lg} text-muted-foreground`} />
              </div>
              <p className="text-sm text-muted-foreground">
                No tienes notificaciones
              </p>
            </div>
          ) : (
            <div className={spacing.contentStackTight}>
              {notifications.map((notification) => {
                const style = getNotificationStyle(notification.type);
                const isUnread = !notification.isRead;
                const content = (
                  <div className={cn("rounded-2xl p-4 transition-colors", style.bg)}>
                    <div className="flex gap-3">
                      <div className="mt-0.5 shrink-0 flex size-8 items-center justify-center rounded-full bg-white/60">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm">{notification.title}</p>
                          {isUnread && (
                            <span className="mt-1 shrink-0 size-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
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
                  <Link
                    key={notification.id}
                    href={notification.actionUrl}
                    onClick={() => setOpen(false)}
                    className="block"
                  >
                    {content}
                  </Link>
                ) : (
                  <div key={notification.id}>{content}</div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
