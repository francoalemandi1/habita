"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";

import type { SerializedService } from "@/types/expense";

export function useServices(onExpenseGenerated: () => void) {
  const [services, setServices] = useState<SerializedService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const router = useRouter();
  const toast = useToast();

  const fetchServices = useCallback(async () => {
    try {
      const result = await apiFetch<SerializedService[]>("/api/services");
      setServices(result);
    } catch {
      // Silently fail — services are not critical for page load
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const activeServices = useMemo(
    () => services.filter((s) => s.isActive),
    [services],
  );

  const inactiveServices = useMemo(
    () => services.filter((s) => !s.isActive),
    [services],
  );

  const generate = useCallback(
    async (serviceId: string) => {
      setGeneratingIds((prev) => new Set(prev).add(serviceId));
      try {
        await apiFetch(`/api/services/${serviceId}/generate`, { method: "POST" });
        toast.success("Gasto registrado");
        await fetchServices();
        onExpenseGenerated();
        router.refresh();
      } catch {
        toast.error("Error", "No se pudo registrar el gasto");
      } finally {
        setGeneratingIds((prev) => {
          const next = new Set(prev);
          next.delete(serviceId);
          return next;
        });
      }
    },
    [fetchServices, onExpenseGenerated, router, toast],
  );

  const deleteService = useCallback(
    async (serviceId: string) => {
      try {
        await apiFetch(`/api/services/${serviceId}`, { method: "DELETE" });
        setServices((prev) => prev.filter((s) => s.id !== serviceId));
        toast.success("Servicio eliminado");
      } catch {
        toast.error("Error", "No se pudo eliminar");
      }
    },
    [toast],
  );

  const toggleActive = useCallback(
    async (service: SerializedService) => {
      try {
        await apiFetch(`/api/services/${service.id}`, {
          method: "PATCH",
          body: { isActive: !service.isActive },
        });
        await fetchServices();
      } catch {
        toast.error("Error", "No se pudo actualizar");
      }
    },
    [fetchServices, toast],
  );

  return {
    services,
    activeServices,
    inactiveServices,
    isLoading,
    generatingIds,
    generate,
    deleteService,
    toggleActive,
    refresh: fetchServices,
  };
}
