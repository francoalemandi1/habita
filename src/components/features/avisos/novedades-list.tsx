"use client";

import { useEffect, useRef } from "react";
import {
  ArrowRightLeft,
  AlertTriangle,
  Bell,
  BarChart3,
  Calendar,
  CalendarCheck,
  CheckSquare,
  Gift,
  Trophy,
  TrendingUp,
} from "lucide-react";
import { ListRow } from "@/components/ds/list-row";
import { EmptyState } from "@/components/ds/empty-state";
import { Skeleton } from "@/components/ds/skeleton";
import { useNotifications } from "@/hooks/use-notifications";
import { formatNotificationTime } from "@/lib/avisos-logic";
import { InlineError } from "../inline-error";

import type { LucideIcon } from "lucide-react";
import type { NotificationItem } from "@/hooks/use-notifications";

const NOTIFICATION_ICONS: Record<string, LucideIcon> = {
  TRANSFER_REQUEST: ArrowRightLeft,
  TRANSFER_ACCEPTED: ArrowRightLeft,
  TRANSFER_REJECTED: ArrowRightLeft,
  TASK_OVERDUE: AlertTriangle,
  ACHIEVEMENT_UNLOCKED: Trophy,
  LEVEL_UP: TrendingUp,
  REMINDER_DUE: Bell,
  PLAN_READY: CalendarCheck,
  PLAN_APPLIED: CalendarCheck,
  REWARD_REDEEMED: Gift,
  SERVICE_DUE_SOON: Calendar,
  EXPENSE_WEEKLY_SUMMARY: BarChart3,
  TASK_REMINDER: CheckSquare,
};

function iconFor(type: string): LucideIcon {
  return NOTIFICATION_ICONS[type] ?? Bell;
}

function NovedadRow({ notification }: { notification: NotificationItem }): React.JSX.Element {
  const row = (
    <ListRow
      leadingIcon={iconFor(notification.type)}
      title={notification.title}
      meta={`${notification.message} · ${formatNotificationTime(notification.createdAt)}`}
    />
  );
  return notification.actionUrl ? (
    <a href={notification.actionUrl} className="block">
      {row}
    </a>
  ) : (
    row
  );
}

/** §5.3 Avisos → Novedades — read-only feed; marks everything read on view. */
export function NovedadesList(): React.JSX.Element {
  const { data, isLoading, isError, refetch, markAllAsRead } = useNotifications();

  const unreadCount = data?.unreadCount ?? 0;
  const hasMarkedRef = useRef(false);
  const { mutate: markAllAsReadMutate } = markAllAsRead;

  useEffect(() => {
    if (unreadCount > 0 && !hasMarkedRef.current) {
      hasMarkedRef.current = true;
      markAllAsReadMutate();
    }
  }, [unreadCount, markAllAsReadMutate]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-[60px] w-full" />
        <Skeleton className="h-[60px] w-full" />
        <Skeleton className="h-[60px] w-full" />
      </div>
    );
  }

  if (isError) {
    return <InlineError message="No pudimos cargar los avisos." onRetry={() => refetch()} />;
  }

  const notifications = data?.notifications ?? [];

  if (notifications.length === 0) {
    return <EmptyState icon={Bell} title="Estás al día" />;
  }

  return (
    <div className="rounded-[16px] bg-surface px-1">
      {notifications.map((notification) => (
        <NovedadRow key={notification.id} notification={notification} />
      ))}
    </div>
  );
}
