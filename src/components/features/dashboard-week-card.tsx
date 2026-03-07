"use client";

import { useMemo } from "react";
import { Share2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  computeMemberPoints,
  computeHouseholdTotal,
  getTierLabel,
  getNextTier,
} from "@/lib/points-utils";
import { cyclingColors, cyclingTextColors, contrastText } from "@/lib/design-tokens";

import type { TierColorKey } from "@/lib/points-utils";

interface MemberStat {
  id: string;
  name: string;
  weeklyTasks: number;
  weeklyPoints: number;
}

interface DashboardWeekCardProps {
  memberStats: MemberStat[];
  householdStreak: number;
  isSolo: boolean;
  currentMemberId: string;
}

function getMemberInitial(name: string): string {
  return name.trim().slice(0, 1).toUpperCase();
}

function getTierBadgeClasses(colorKey: TierColorKey): string {
  switch (colorKey) {
    case "gold":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
    case "fire":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300";
    case "primary":
      return "bg-primary/10 text-primary";
    case "info":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
    case "success":
      return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getProgressColor(colorKey: TierColorKey): string {
  switch (colorKey) {
    case "gold":
    case "fire":
      return "bg-amber-500";
    case "primary":
      return "bg-primary";
    case "info":
      return "bg-blue-500";
    case "success":
      return "bg-green-500";
    default:
      return "bg-muted-foreground";
  }
}

export function DashboardWeekCard({
  memberStats,
  householdStreak,
  isSolo,
  currentMemberId,
}: DashboardWeekCardProps) {
  const memberBreakdowns = useMemo(
    () =>
      memberStats.map((m, originalIndex) => ({
        ...m,
        originalIndex,
        points: computeMemberPoints(m.weeklyPoints ?? m.weeklyTasks, m.weeklyTasks, householdStreak),
      })),
    [memberStats, householdStreak],
  );

  const ranked = useMemo(
    () => [...memberBreakdowns].sort((a, b) => b.points.total - a.points.total),
    [memberBreakdowns],
  );

  const householdTotal = useMemo(
    () => computeHouseholdTotal(memberBreakdowns.map((m) => m.points)),
    [memberBreakdowns],
  );

  const tier = getTierLabel(householdTotal);
  const nextTier = getNextTier(householdTotal);

  if (memberStats.length === 0) return null;

  const streakText = isSolo
    ? `${householdStreak} semana${householdStreak === 1 ? "" : "s"} activo/a`
    : `${householdStreak} semana${householdStreak === 1 ? "" : "s"} seguidas`;

  const progressValue = nextTier
    ? Math.min((householdTotal / nextTier.threshold) * 100, 100)
    : 100;

  return (
    <Card className="animate-fade-in">
      <CardContent className="flex flex-col items-center py-6 px-5">
        {/* Header */}
        <div className="flex w-full items-center justify-between mb-3">
          <span className="text-sm font-semibold text-muted-foreground">Esta semana</span>
          <button
            type="button"
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Compartir"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>

        {/* Big number */}
        <p className="font-handwritten text-5xl font-bold text-primary leading-tight">
          {householdTotal}
        </p>
        <p className="text-sm text-muted-foreground mt-0.5">puntos</p>

        {/* Tier badge */}
        <span className={`mt-3 inline-flex items-center gap-1 rounded-full px-4 py-1 font-handwritten text-lg font-semibold ${getTierBadgeClasses(tier.colorKey)}`}>
          {tier.emoji} {tier.label}
        </span>

        {/* Progress bar */}
        {nextTier && (
          <div className="mt-3 flex w-3/5 flex-col items-center gap-1">
            <Progress
              value={progressValue}
              className="h-1 bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              {nextTier.threshold - householdTotal} pts → {nextTier.emoji} {nextTier.label}
            </p>
          </div>
        )}

        {/* Ranked members */}
        {ranked.length > 1 && (
          <div className="mt-5 flex flex-wrap justify-center gap-6">
            {ranked.map((member, rankIndex) => {
              const isMe = member.id === currentMemberId;
              const isLeader = rankIndex === 0 && member.points.total > 0;
              const bgColor = cyclingColors[member.originalIndex % cyclingColors.length] ?? "#5260fe";
              const textColor = cyclingTextColors[member.originalIndex % cyclingTextColors.length] ?? "#ffffff";

              return (
                <div key={member.id} className="flex flex-col items-center gap-0.5">
                  {/* Crown */}
                  {isLeader ? (
                    <span className="text-sm mb-0.5">👑</span>
                  ) : (
                    <div className="h-[22px]" />
                  )}
                  {/* Avatar */}
                  <div
                    className={`flex items-center justify-center rounded-full font-bold ${
                      isLeader ? "h-[50px] w-[50px] text-lg" : "h-11 w-11 text-base"
                    } ${isMe ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
                    style={{ backgroundColor: bgColor, color: textColor }}
                  >
                    {getMemberInitial(member.name)}
                  </div>
                  {/* Points */}
                  <span className="text-sm font-bold">{member.points.total}</span>
                  {/* Name */}
                  <span className="max-w-16 truncate text-xs text-muted-foreground">
                    {member.name.split(" ")[0]}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Streak */}
        {householdStreak > 0 && (
          <span className="mt-4 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
            🔥 {streakText}
          </span>
        )}
      </CardContent>
    </Card>
  );
}
