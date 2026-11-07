"use client";

import { useCallback, useState } from "react";
import { useAiJobStatus } from "@/hooks/use-ai-job-status";
import { apiFetch } from "@/lib/api-client";

import type { MemberType } from "@prisma/client";

export interface WeeklyPlanAssignment {
  taskName: string;
  memberId: string;
  memberName: string;
  memberType: MemberType;
  reason: string;
  dayOfWeek?: number;
}

export interface WeeklyPlanPreview {
  id: string;
  assignments: WeeklyPlanAssignment[];
  balanceScore: number;
  notes: string[];
  durationDays: number;
  startDate: string;
  endDate: string;
}

interface PreviewPlanJobResult {
  plan: WeeklyPlanPreview;
}

interface ApplyPlanResult {
  success: boolean;
  assignmentsCreated: number;
}

/** Drives the `/tareas/plan` screen: trigger preview, poll via the shared AI job hook, apply when confirmed. */
export function useWeeklyPlan() {
  const [plan, setPlan] = useState<WeeklyPlanPreview | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  const { refetchStatus, isRunning } = useAiJobStatus({
    jobType: "PREVIEW_PLAN",
    onComplete: async (jobId) => {
      try {
        const result = await apiFetch<{ resultData: PreviewPlanJobResult }>(`/api/ai/job-result/${jobId}`);
        setPlan(result.resultData.plan);
        setPreviewFailed(false);
      } catch (error) {
        console.warn("No se pudo leer el resultado del plan", error);
        setPreviewFailed(true);
      } finally {
        setIsGenerating(false);
      }
    },
    onError: () => {
      setPreviewFailed(true);
      setIsGenerating(false);
    },
  });

  const generate = useCallback(
    async (startDate: Date, endDate: Date) => {
      setIsGenerating(true);
      setPreviewFailed(false);
      setPlan(null);
      setApplied(false);
      try {
        await apiFetch("/api/ai/preview-plan", {
          method: "POST",
          body: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
        });
        await refetchStatus();
      } catch (error) {
        console.warn("No se pudo iniciar la generación del plan", error);
        setPreviewFailed(true);
        setIsGenerating(false);
      }
    },
    [refetchStatus],
  );

  const apply = useCallback(async (): Promise<ApplyPlanResult> => {
    if (!plan) return { success: false, assignmentsCreated: 0 };
    setIsApplying(true);
    try {
      const result = await apiFetch<ApplyPlanResult>("/api/ai/apply-plan", {
        method: "POST",
        body: {
          planId: plan.id,
          assignments: plan.assignments.map((a) => ({
            taskName: a.taskName,
            memberId: a.memberId,
            memberName: a.memberName,
            dayOfWeek: a.dayOfWeek,
          })),
        },
      });
      if (result.success) setApplied(true);
      return result;
    } finally {
      setIsApplying(false);
    }
  }, [plan]);

  return {
    plan,
    isGenerating: isGenerating || isRunning,
    previewFailed,
    isApplying,
    applied,
    generate,
    apply,
  };
}
