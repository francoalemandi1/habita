"use client";

import { useState, useEffect } from "react";
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
import { Bell, ArrowRightLeft, AlertTriangle, Trophy, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: "transfer_request" | "transfer_accepted" | "transfer_rejected" | "task_overdue" | "achievement_unlocked" | "level_up";
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  actionUrl?: string;
}

const NOTIFICATION_STYLES: Record<Notification["type"], { bg: string; iconColor: string }> = {
  transfer_request: { bg: "bg-[#e4d5ff]/50", iconColor: "text-primary" },
  transfer_accepted: { bg: "bg-[#d2ffa0]/40", iconColor: "text-green-600" },
  transfer_rejected: { bg: "bg-red-50", iconColor: "text-red-500" },
  task_overdue: { bg: "bg-[#fff0d7]", iconColor: "text-red-500" },
  achievement_unlocked: { bg: "bg-[#fff0d7]", iconColor: "text-yellow-500" },
  level_up: { bg: "bg-[#d2ffa0]/40", iconColor: "text-green-500" },
};

function getNotificationIcon(type: Notification["type"]) {
  const style = NOTIFICATION_STYLES[type];
  switch (type) {
    case "transfer_request":
    case "transfer_accepted":
    case "transfer_rejected":
      return <ArrowRightLeft className={cn("h-4 w-4", style.iconColor)} />;
    case "task_overdue":
      return <AlertTriangle className={cn("h-4 w-4", style.iconColor)} />;
    case "achievement_unlocked":
      return <Trophy className={cn("h-4 w-4", style.iconColor)} />;
    case "level_up":
      return <TrendingUp className={cn("h-4 w-4", style.iconColor)} />;
    default:
      return <Bell className="h-4 w-4" />;
  }
}

function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "ahora";
  if (diffMins < 60) return `hace ${diffMins} min`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays === 1) return "ayer";
  if (diffDays < 7) return `hace ${diffDays} días`;
  return past.toLocaleDateString("es", { day: "numeric", month: "short" });
}

export function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
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
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
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
      <DialogContent className="max-h-[80vh] overflow-hidden p-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificaciones
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto px-5 pb-5">
          {isLoading ? (
            <p className="py-8 text-center text-muted-foreground">Cargando...</p>
          ) : notifications.length === 0 ? (
            <div className="py-10 text-center">
              <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-muted/50">
                <Bell className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                No tienes notificaciones
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => {
                const style = NOTIFICATION_STYLES[notification.type];
                const content = (
                  <div className={cn("rounded-2xl p-4 transition-colors", style.bg)}>
                    <div className="flex gap-3">
                      <div className="mt-0.5 shrink-0 flex size-8 items-center justify-center rounded-full bg-white/60">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{notification.title}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {notification.message}
                        </p>
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          {formatRelativeTime(notification.createdAt)}
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
