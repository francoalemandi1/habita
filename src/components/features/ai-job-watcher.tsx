"use client";

import { useRouter } from "next/navigation";
import { useAiJobStatus } from "@/hooks/use-ai-job-status";
import { useToast } from "@/components/ui/toast";

import type { AiJobType } from "@habita/contracts";

interface JobConfig {
  jobType: AiJobType;
  successTitle: string;
  actionLabel: string;
  href: string;
  errorTitle: string;
}

const JOB_CONFIGS: JobConfig[] = [
  {
    jobType: "PREVIEW_PLAN",
    successTitle: "Plan listo",
    actionLabel: "Ver plan",
    href: "/plan",
    errorTitle: "Error generando el plan",
  },
  {
    jobType: "COCINA",
    successTitle: "Recetas listas",
    actionLabel: "Ver recetas",
    href: "/cocina",
    errorTitle: "Error generando recetas",
  },
  {
    jobType: "SHOPPING_PLAN",
    successTitle: "Precios encontrados",
    actionLabel: "Ver resultados",
    href: "/compras",
    errorTitle: "Error buscando precios",
  },
];

function JobWatcher({ config }: { config: JobConfig }) {
  const router = useRouter();
  const toast = useToast();

  useAiJobStatus({
    jobType: config.jobType,
    onComplete: () => {
      toast.success(config.successTitle, {
        action: {
          label: config.actionLabel,
          onClick: () => router.push(config.href),
        },
      });
    },
    onError: (errorMessage) => {
      toast.error(config.errorTitle, errorMessage ?? undefined);
    },
  });

  return null;
}

/**
 * Global watcher that polls all AI job types and shows toast notifications
 * when jobs complete or fail. Mount in the app layout.
 */
export function AiJobWatcher() {
  return (
    <>
      {JOB_CONFIGS.map((config) => (
        <JobWatcher key={config.jobType} config={config} />
      ))}
    </>
  );
}
