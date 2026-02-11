"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import {
  ExternalLink,
  Film,
  Loader2,
  Sofa,
  Sparkles,
  TreePine,
  Trophy,
  User,
  UtensilsCrossed,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { memberRewardColors, spacing, iconSize } from "@/lib/design-tokens";
import { useState } from "react";

import type { ReactNode } from "react";

interface PlanReward {
  id: string;
  name: string;
  description: string | null;
  pointsCost: number;
  memberId: string | null;
  completionRate: number | null;
  category: string | null;
  actionUrl: string | null;
}

interface MemberInfo {
  id: string;
  name: string;
}

interface PlanRewardsSectionProps {
  planId: string | null;
  rewards: PlanReward[];
  members: MemberInfo[];
  canGenerate: boolean;
  hasCompletedTasks: boolean;
}

const CATEGORY_META: Record<string, { icon: ReactNode; label: string }> = {
  OUTING: { icon: <Film className={iconSize.sm} />, label: "Salida" },
  GASTRONOMY: { icon: <UtensilsCrossed className={iconSize.sm} />, label: "Gastronomía" },
  OUTDOOR: { icon: <TreePine className={iconSize.sm} />, label: "Aire libre" },
  HOME: { icon: <Sofa className={iconSize.sm} />, label: "Hogar" },
};

export function PlanRewardsSection({
  planId,
  rewards,
  members,
  canGenerate,
  hasCompletedTasks,
}: PlanRewardsSectionProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const memberMap = new Map(members.map((m) => [m.id, m.name]));

  const handleGenerate = async (force = false) => {
    if (!planId || isGenerating) return;

    setIsGenerating(true);
    try {
      const response = await fetch("/api/ai/generate-rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, force }),
      });

      if (response.status === 409) {
        toast.info("Ya generadas", "Las recompensas ya fueron generadas para este plan");
        return;
      }

      if (!response.ok) {
        const data = await response.json() as { error?: string };
        toast.error("Error", data.error ?? "No se pudieron generar las recompensas");
        return;
      }

      toast.success("Recompensas generadas", "Las recompensas de tu plan están listas");
      router.refresh();
    } catch (error) {
      console.error("Generate rewards error:", error);
      toast.error("Error", "No se pudieron generar las recompensas");
    } finally {
      setIsGenerating(false);
    }
  };

  // No plan and no rewards - show empty state
  if (!planId && rewards.length === 0) {
    return (
      <div className="rounded-2xl bg-brand-cream px-6 py-8 text-center">
        <Sparkles className={`mx-auto mb-3 ${iconSize["2xl"]} text-foreground-tertiary`} />
        <p className="font-medium text-foreground">Sin recompensas aún</p>
        <p className="text-sm text-muted-foreground mt-1">
          Las recompensas se generan automáticamente al finalizar un plan
        </p>
      </div>
    );
  }

  // Plan exists but no rewards yet - show generate button
  if (canGenerate && rewards.length === 0) {
    return (
      <div className="rounded-2xl bg-brand-lavender-light/50 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4 flex-1">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-lavender">
              <Sparkles className={`${iconSize.xl} text-brand-purple-dark`} />
            </div>
            <div>
              <p className="font-semibold text-foreground">Generar recompensas</p>
              <p className="text-sm text-muted-foreground">
                Genera recompensas basadas en el rendimiento del plan
              </p>
            </div>
          </div>
          <Button
            onClick={() => handleGenerate()}
            disabled={isGenerating}
            className="shrink-0 gap-2 rounded-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className={`${iconSize.md} animate-spin`} />
                Generando...
              </>
            ) : (
              <>
                <Sparkles className={iconSize.md} />
                Generar
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Show rewards grouped by member
  const rewardsByMember = new Map<string, PlanReward[]>();
  for (const reward of rewards) {
    const key = reward.memberId ?? "unknown";
    const existing = rewardsByMember.get(key) ?? [];
    existing.push(reward);
    rewardsByMember.set(key, existing);
  }


  return (
    <div className={spacing.contentStack}>
      <div className="flex items-center gap-2">
        <Trophy className={`${iconSize.lg} text-yellow-500`} />
        <h2 className="text-xl font-semibold">Recompensas del plan</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from(rewardsByMember.entries()).map(([memberId, memberRewards], index) => {
          const memberName = memberMap.get(memberId) ?? "Miembro";
          const completionRate = memberRewards[0]?.completionRate ?? 0;
          const colors = memberRewardColors[index % memberRewardColors.length]!;

          return (
            <div key={memberId} className={`rounded-2xl ${colors.bg} ${spacing.cardPaddingWide}`}>
              <div className="flex items-center gap-2 mb-1">
                <User className={`${iconSize.md} ${colors.text} opacity-60`} />
                <span className={`font-semibold ${colors.text}`}>{memberName}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{completionRate}% completado</p>
              <Progress value={completionRate} className="mb-4 h-2" />
              <div className={spacing.contentStackTight}>
                {memberRewards.map((reward) => {
                  const categoryMeta = reward.category ? CATEGORY_META[reward.category] : null;

                  return (
                    <div key={reward.id} className={`rounded-2xl ${colors.rewardBg} p-3 shadow-sm`}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {categoryMeta && (
                            <span className="shrink-0 text-muted-foreground">{categoryMeta.icon}</span>
                          )}
                          <span className="font-medium text-sm text-foreground truncate">{reward.name}</span>
                        </div>
                        {categoryMeta && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            {categoryMeta.label}
                          </Badge>
                        )}
                      </div>
                      {reward.description && (
                        <p className="text-xs text-muted-foreground mb-2">{reward.description}</p>
                      )}
                      {reward.actionUrl && (
                        <a
                          href={reward.actionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          <ExternalLink className={iconSize.xs} />
                          Ver actividad
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Force regenerate button for demo/testing */}
      {planId && hasCompletedTasks && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleGenerate(true)}
            disabled={isGenerating}
            className="gap-2 text-muted-foreground"
          >
            {isGenerating ? (
              <Loader2 className={`${iconSize.xs} animate-spin`} />
            ) : (
              <Sparkles className={iconSize.xs} />
            )}
            Forzar regeneración
          </Button>
        </div>
      )}
    </div>
  );
}
