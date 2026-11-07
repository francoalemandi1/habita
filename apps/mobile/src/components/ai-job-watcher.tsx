import { useRouter } from "expo-router";
import { useAiJobStatus } from "@/hooks/use-ai-job-status";
import { useSnackbar } from "@/components/ds";

import type { AiJobType } from "@habita/contracts";

interface JobConfig {
  jobType: AiJobType;
  successMessage: string;
  actionLabel: string;
  href: string;
  errorMessage: string;
}

const JOB_CONFIGS: JobConfig[] = [
  {
    jobType: "PREVIEW_PLAN",
    successMessage: "Plan listo",
    actionLabel: "Ver plan",
    href: "/(app)/tareas/plan",
    errorMessage: "Error generando el plan",
  },
  {
    jobType: "SHOPPING_PLAN",
    successMessage: "Precios encontrados",
    actionLabel: "Ver resultados",
    href: "/(app)/super",
    errorMessage: "Error buscando precios",
  },
];

function JobWatcher({ config }: { config: JobConfig }) {
  const router = useRouter();
  const snackbar = useSnackbar();

  useAiJobStatus({
    jobType: config.jobType,
    onComplete: () => {
      snackbar.show({
        text: config.successMessage,
        tone: "navigation",
        actionLabel: config.actionLabel,
        onAction: () => router.push(config.href as never),
      });
    },
    onError: () => {
      snackbar.show({ text: config.errorMessage, tone: "error" });
    },
  });

  return null;
}

/**
 * Global watcher that polls all AI job types and shows toast notifications.
 * Mount in the app layout.
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
