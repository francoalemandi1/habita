"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAiJobStatus } from "@/hooks/use-ai-job-status";
import { useSnackbar } from "@/components/ds/snackbar";
import { APP_ROUTES, TAREAS_ROUTES } from "@habita/contracts";

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
    href: TAREAS_ROUTES.plan,
    errorTitle: "Error generando el plan",
  },
  {
    jobType: "SHOPPING_PLAN",
    successTitle: "Precios encontrados",
    actionLabel: "Ver resultados",
    href: APP_ROUTES.super,
    errorTitle: "Error buscando precios",
  },
];

function JobWatcher({ config }: { config: JobConfig }) {
  const router = useRouter();
  const pathname = usePathname();
  const snackbar = useSnackbar();

  useAiJobStatus({
    jobType: config.jobType,
    onComplete: () => {
      // The result already renders on its own screen; a "Ver" snackbar there is noise.
      if (pathname === config.href) return;
      snackbar.show({
        text: config.successTitle,
        actionKind: "navigate",
        actionLabel: config.actionLabel,
        onAction: () => router.push(config.href),
      });
    },
    onError: (errorMessage) => {
      snackbar.show({ text: errorMessage ?? config.errorTitle, tone: "error" });
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
