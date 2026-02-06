"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import { Loader2, Sparkles, Trophy, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface PlanReward {
  id: string;
  name: string;
  description: string | null;
  pointsCost: number;
  memberId: string | null;
  completionRate: number | null;
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
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <Sparkles className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-medium">Sin recompensas aún</p>
          <p className="text-sm text-muted-foreground mt-1">
            Las recompensas se generan automáticamente al finalizar un plan
          </p>
        </CardContent>
      </Card>
    );
  }

  // Plan exists but no rewards yet - show generate button
  if (canGenerate && rewards.length === 0) {
    return (
      <div className="rounded-3xl bg-gray-100 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4 flex-1">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100">
              <Sparkles className="h-6 w-6 text-blue-600" />
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
                <Loader2 className="h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
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
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-yellow-500" />
        <h2 className="text-xl font-semibold">Recompensas del plan</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from(rewardsByMember.entries()).map(([memberId, memberRewards]) => {
          const memberName = memberMap.get(memberId) ?? "Miembro";
          const completionRate = memberRewards[0]?.completionRate ?? 0;

          return (
            <Card key={memberId}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">{memberName}</CardTitle>
                </div>
                <CardDescription className="flex items-center gap-2">
                  <span>{completionRate}% completado</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Progress value={completionRate} className="mb-3 h-2" />
                {memberRewards.map((reward) => (
                  <div key={reward.id} className="rounded-2xl border bg-muted/30 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{reward.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {reward.pointsCost} pts
                      </Badge>
                    </div>
                    {reward.description && (
                      <p className="text-xs text-muted-foreground">{reward.description}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
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
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            Forzar regeneración
          </Button>
        </div>
      )}
    </div>
  );
}
