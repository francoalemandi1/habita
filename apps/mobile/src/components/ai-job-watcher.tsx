import { useRouter } from "expo-router";
import { useAiJobStatus } from "@/hooks/use-ai-job-status";
import { useToast } from "@/components/ui/toast";

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
    href: "/(app)/plan",
    errorMessage: "Error generando el plan",
  },
  {
    jobType: "COCINA",
    successMessage: "Recetas listas",
    actionLabel: "Ver recetas",
    href: "/(app)/cocina",
    errorMessage: "Error generando recetas",
  },
  {
    jobType: "SHOPPING_PLAN",
    successMessage: "Precios encontrados",
    actionLabel: "Ver resultados",
    href: "/(app)/compras",
    errorMessage: "Error buscando precios",
  },
];

function JobWatcher({ config }: { config: JobConfig }) {
  const router = useRouter();
  const toast = useToast();

  useAiJobStatus({
    jobType: config.jobType,
    onComplete: () => {
      toast.success(config.successMessage, {
        label: config.actionLabel,
        onPress: () => router.push(config.href as never),
      });
    },
    onError: () => {
      toast.error(config.errorMessage);
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
