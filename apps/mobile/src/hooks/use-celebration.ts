import { useCallback } from "react";
import { useToast } from "@/components/ui/toast";

export type CelebrationType =
  | "first-expense"
  | "first-search"
  | "first-recipe"
  | "first-event-saved"
  | "first-invite-sent"
  | "tour-complete"
  | "share-nudge";

const CELEBRATIONS: Record<CelebrationType, { title: string; message: string }> = {
  "first-expense":     { title: "🎉 ¡Primer gasto registrado!", message: "Ya tenés visibilidad sobre tus gastos" },
  "first-search":      { title: "🔍 ¡Primera búsqueda!", message: "Ahora sabés dónde comprar más barato" },
  "first-recipe":      { title: "👨‍🍳 ¡Primera receta!", message: "Descubriste qué cocinar con lo que tenés" },
  "first-event-saved": { title: "🎫 ¡Evento guardado!", message: "No te lo vas a perder" },
  "first-invite-sent": { title: "🏠 ¡Invitación enviada!", message: "Te avisamos cuando se una" },
  "tour-complete":     { title: "🚀 ¡Ya conocés todo Habita!", message: "Tu hogar organizado empieza acá" },
  "share-nudge":       { title: "💪 ¡Vas volando!", message: "Compartí con tu hogar cómo viene la semana" },
};

export function useCelebration() {
  const toast = useToast();

  const celebrate = useCallback((type: CelebrationType) => {
    const config = CELEBRATIONS[type];
    toast.show(`${config.title}\n${config.message}`, "celebration");
  }, [toast]);

  return { celebrate };
}
