"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message?: string;
  retry?: () => void;
  showHomeButton?: boolean;
  showBackButton?: boolean;
}

export function ErrorState({
  title = "Algo salió mal",
  message = "Ha ocurrido un error inesperado. Por favor, intenta de nuevo.",
  retry,
  showHomeButton = true,
  showBackButton = false,
}: ErrorStateProps) {
  const router = useRouter();

  return (
    <Card className="border-destructive/50">
      <CardContent className="flex flex-col items-center py-12 text-center">
        <AlertTriangle className="mb-4 h-12 w-12 text-destructive" />
        <h2 className="mb-2 text-xl font-semibold">{title}</h2>
        <p className="mb-6 max-w-md text-muted-foreground">{message}</p>
        <div className="flex gap-3">
          {showBackButton && (
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          )}
          {retry && (
            <Button variant="outline" onClick={retry}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reintentar
            </Button>
          )}
          {showHomeButton && (
            <Button onClick={() => router.push("/dashboard")}>
              <Home className="mr-2 h-4 w-4" />
              Ir al inicio
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function NotFoundState({
  resource = "recurso",
}: {
  resource?: string;
}) {
  const router = useRouter();

  return (
    <Card>
      <CardContent className="flex flex-col items-center py-12 text-center">
        <div className="mb-4 text-6xl">🔍</div>
        <h2 className="mb-2 text-xl font-semibold">No encontrado</h2>
        <p className="mb-6 text-muted-foreground">
          El {resource} que buscas no existe o ha sido eliminado.
        </p>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
      </CardContent>
    </Card>
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
    <Card>
      <CardContent className="flex flex-col items-center py-12 text-center">
        {icon && <div className="mb-4">{icon}</div>}
        <h2 className="mb-2 text-lg font-semibold">{title}</h2>
        <p className="mb-6 max-w-md text-muted-foreground">{message}</p>
        {steps && steps.length > 0 && (
          <div className="mb-6 mt-2 w-full max-w-sm space-y-2 text-left">
            {steps.map((step, index) => (
              <div key={step.label} className="flex items-center gap-2.5">
                <div className="flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                  {index + 1}
                </div>
                <span className="text-[13px] text-muted-foreground">{step.label}</span>
              </div>
            ))}
          </div>
        )}
        {action}
      </CardContent>
    </Card>
  );
}

export function AccessDeniedState() {
  const router = useRouter();

  return (
    <Card className="border-yellow-500/50">
      <CardContent className="flex flex-col items-center py-12 text-center">
        <div className="mb-4 text-6xl">🔒</div>
        <h2 className="mb-2 text-xl font-semibold">Acceso restringido</h2>
        <p className="mb-6 text-muted-foreground">
          No tienes permiso para acceder a esta sección.
        </p>
        <Button onClick={() => router.push("/dashboard")}>
          <Home className="mr-2 h-4 w-4" />
          Ir al inicio
        </Button>
      </CardContent>
    </Card>
  );
}
