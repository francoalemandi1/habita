"use client";

import { useCallback } from "react";
import { useToast } from "@/components/ui/toast";

export type CelebrationType =
  | "first-expense"
  | "first-search"
  | "first-recipe"
  | "first-event-saved"
  | "first-invite-sent"
  | "tour-complete";

const CELEBRATIONS: Record<CelebrationType, { title: string; message: string }> = {
  "first-expense":     { title: "🎉 ¡Primer gasto registrado!", message: "Ya tenés visibilidad sobre tus gastos" },
  "first-search":      { title: "🔍 ¡Primera búsqueda!", message: "Ahora sabés dónde comprar más barato" },
  "first-recipe":      { title: "👨‍🍳 ¡Primera receta!", message: "Descubriste qué cocinar con lo que tenés" },
  "first-event-saved": { title: "🎫 ¡Evento guardado!", message: "No te lo vas a perder" },
  "first-invite-sent": { title: "🏠 ¡Invitación enviada!", message: "Te avisamos cuando se una" },
  "tour-complete":     { title: "🚀 ¡Ya conocés todo Habita!", message: "Tu hogar organizado empieza acá" },
};

export function useCelebration() {
  const toast = useToast();

  const celebrate = useCallback((type: CelebrationType) => {
    const config = CELEBRATIONS[type];
    toast.addToast({ type: "celebration", title: config.title, message: config.message });
  }, [toast]);

  return { celebrate };
}
