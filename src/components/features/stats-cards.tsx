"use client";

import { CheckCircle2, Clock, Users } from "lucide-react";
import { statCardColors, spacing, iconSize, radius } from "@/lib/design-tokens";

interface StatsCardsProps {
  completed: number;
  pending: number;
  members: number;
}

const STATS_CONFIG = [
  {
    key: "completed",
    label: "Completadas",
    sublabel: "totales",
    ...statCardColors.purple,
    icon: CheckCircle2,
  },
  {
    key: "pending",
    label: "Pendientes",
    sublabel: "por hacer",
    ...statCardColors.lime,
    icon: Clock,
  },
  {
    key: "members",
    label: "Miembros",
    sublabel: "activos",
    ...statCardColors.tan,
    icon: Users,
  },
] as const;

export function StatsCards({ completed, pending, members }: StatsCardsProps) {
  const values: Record<string, number> = { completed, pending, members };

  return (
    <div className={`grid grid-cols-2 ${spacing.gridGap} md:grid-cols-3`}>
      {STATS_CONFIG.map((stat, index) => {
        const Icon = stat.icon;
        const value = values[stat.key] ?? 0;
        return (
          <div
            key={stat.key}
            className={`animate-stagger-fade-in ${radius.cardCompact} ${stat.bg} ${spacing.cardPaddingCompact} transition-transform duration-200 hover:scale-[1.02]`}
            style={{ '--stagger-index': index } as React.CSSProperties}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold sm:text-sm ${stat.text}`}>
                {stat.label}
              </span>
              <Icon className={`${iconSize.md} shrink-0 ${stat.text} opacity-70`} />
            </div>
            <div className={`mt-2 text-2xl font-bold sm:text-3xl ${stat.text}`}>
              {value}
            </div>
            <p className={`text-xs ${stat.text} opacity-60`}>{stat.sublabel}</p>
          </div>
        );
      })}
    </div>
  );
}
