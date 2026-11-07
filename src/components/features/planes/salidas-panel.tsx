"use client";

import Link from "next/link";
import { Compass, MapPin } from "lucide-react";
import { EmptyState } from "@/components/ds/empty-state";
import { SalidasGroup } from "@/components/features/planes/salidas-group";
import { useRelaxSuggestions } from "@/hooks/use-relax-suggestions";
import { ApiError } from "@/lib/api-client";
import { resolveSalidaGroupState } from "@/lib/planes-salidas-logic";
import { APP_ROUTES } from "@habita/contracts";

function statusOf(error: unknown): number | undefined {
  return error instanceof ApiError ? error.status : undefined;
}

/** Planes → "Salidas": AI-suggested activities and restaurants, lazily fetched on mount. */
export function SalidasPanel(): React.JSX.Element {
  const activitiesQuery = useRelaxSuggestions({ section: "activities" });
  const restaurantsQuery = useRelaxSuggestions({ section: "restaurants" });

  const activitiesState = resolveSalidaGroupState({
    isLoading: activitiesQuery.isLoading,
    isError: activitiesQuery.isError,
    errorStatus: statusOf(activitiesQuery.error),
    eventCount: activitiesQuery.data?.events.length ?? 0,
  });
  const restaurantsState = resolveSalidaGroupState({
    isLoading: restaurantsQuery.isLoading,
    isError: restaurantsQuery.isError,
    errorStatus: statusOf(restaurantsQuery.error),
    eventCount: restaurantsQuery.data?.events.length ?? 0,
  });

  if (activitiesState === "missing-city" || restaurantsState === "missing-city") {
    return (
      <EmptyState
        icon={MapPin}
        title="Falta tu ubicación"
        description="Configurá la ubicación de tu hogar en Perfil para ver salidas cerca."
        action={
          <Link href={APP_ROUTES.perfil} className="text-[13px] font-semibold text-monte underline underline-offset-[3px]">
            Ir a Perfil
          </Link>
        }
      />
    );
  }

  if (activitiesState === "ai-disabled" && restaurantsState === "ai-disabled") {
    return (
      <EmptyState
        icon={Compass}
        title="Hoy no podemos sugerir salidas"
        description="Mirá los planes en Eventos mientras tanto."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <SalidasGroup
        title="Actividades"
        state={activitiesState}
        events={activitiesQuery.data?.events ?? []}
        emptyDescription="No encontramos actividades cerca de tu casa."
        onRetry={() => activitiesQuery.refetch()}
      />
      <SalidasGroup
        title="Restaurantes"
        state={restaurantsState}
        events={restaurantsQuery.data?.events ?? []}
        emptyDescription="No encontramos restaurantes cerca de tu casa."
        onRetry={() => restaurantsQuery.refetch()}
      />
    </div>
  );
}
