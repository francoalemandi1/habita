"use client";

import { CheckCircle2, Clock, AlertTriangle, Users } from "lucide-react";

interface StatsCardsProps {
  completed: number;
  pending: number;
  overdue: number;
  members: number;
}

const STATS_CONFIG = [
  {
    key: "completed",
    label: "Completadas",
    sublabel: "totales",
    bg: "bg-[#d0b6ff]",
    text: "text-[#522a97]",
    icon: CheckCircle2,
  },
  {
    key: "pending",
    label: "Pendientes",
    sublabel: "por hacer",
    bg: "bg-[#d2ffa0]",
    text: "text-[#272727]",
    icon: Clock,
  },
  {
    key: "overdue",
    label: "Atrasadas",
    sublabel: "atención",
    bg: "bg-[#fd7c52]",
    text: "text-white",
    icon: AlertTriangle,
  },
  {
    key: "members",
    label: "Miembros",
    sublabel: "activos",
    bg: "bg-[#ffe8c3]",
    text: "text-[#272727]",
    icon: Users,
  },
] as const;

export function StatsCards({ completed, pending, overdue, members }: StatsCardsProps) {
  const values: Record<string, number> = { completed, pending, overdue, members };

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {STATS_CONFIG.map((stat) => {
        const Icon = stat.icon;
        const value = values[stat.key] ?? 0;
        return (
          <div
            key={stat.key}
            className={`rounded-[10px] ${stat.bg} p-4`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold sm:text-sm ${stat.text}`}>
                {stat.label}
              </span>
              <Icon className={`h-4 w-4 shrink-0 ${stat.text} opacity-70`} />
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
