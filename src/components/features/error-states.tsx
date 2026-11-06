"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle, SearchX, Lock } from "lucide-react";
import { Button } from "@/components/ds/button";
import { APP_ROUTES } from "@habita/contracts";

interface ErrorStateProps {
  title?: string;
  message?: string;
  retry?: () => void;
  showHomeButton?: boolean;
  showBackButton?: boolean;
}

export function ErrorState({
  title = "Algo salió mal",
  message = "Ocurrió un error inesperado. Probá de nuevo.",
  retry,
  showHomeButton = true,
  showBackButton = false,
}: ErrorStateProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center gap-3 rounded-[20px] bg-surface px-6 py-12 text-center">
      <AlertTriangle className="size-10 text-ladrillo" strokeWidth={1.75} />
      <h2 className="text-[22px] font-bold text-ink">{title}</h2>
      <p className="max-w-sm text-[15px] text-ink-2">{message}</p>
      <div className="flex gap-3">
        {showBackButton && (
          <Button variant="secondary" onClick={() => router.back()}>
            Volver
          </Button>
        )}
        {retry && (
          <Button variant="secondary" onClick={retry}>
            Reintentar
          </Button>
        )}
        {showHomeButton && <Button onClick={() => router.push(APP_ROUTES.casa)}>Ir al inicio</Button>}
      </div>
    </div>
  );
}

export function NotFoundState({ resource = "recurso" }: { resource?: string }) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center gap-3 rounded-[20px] bg-surface px-6 py-12 text-center">
      <SearchX className="size-10 text-ink-3" strokeWidth={1.75} />
      <h2 className="text-[22px] font-bold text-ink">No encontrado</h2>
      <p className="max-w-sm text-[15px] text-ink-2">El {resource} que buscás no existe o fue eliminado.</p>
      <Button variant="secondary" onClick={() => router.back()}>
        Volver
      </Button>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  steps,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  message: string;
  steps?: Array<{ label: string }>;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[20px] bg-surface px-6 py-12 text-center">
      {icon}
      <h2 className="text-[22px] font-bold text-ink">{title}</h2>
      <p className="max-w-sm text-[15px] text-ink-2">{message}</p>
      {steps && steps.length > 0 && (
        <div className="mt-2 flex w-full max-w-sm flex-col gap-2 text-left">
          {steps.map((step, index) => (
            <div key={step.label} className="flex items-center gap-2.5">
              <div className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-monte-soft text-[11px] font-bold text-monte">
                {index + 1}
              </div>
              <span className="text-[13px] text-ink-2">{step.label}</span>
            </div>
          ))}
        </div>
      )}
      {action}
    </div>
  );
}

export function AccessDeniedState() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center gap-3 rounded-[20px] bg-surface px-6 py-12 text-center">
      <Lock className="size-10 text-ink-3" strokeWidth={1.75} />
      <h2 className="text-[22px] font-bold text-ink">Acceso restringido</h2>
      <p className="max-w-sm text-[15px] text-ink-2">No tenés permiso para acceder a esta sección.</p>
      <Button onClick={() => router.push(APP_ROUTES.casa)}>Ir al inicio</Button>
    </div>
  );
}
