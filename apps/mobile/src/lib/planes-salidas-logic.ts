import type { RelaxEvent } from "@/hooks/use-relax-suggestions";

/** /api/ai/relax-suggestions returns 400 when the household has no city configured. */
export function isMissingCityStatus(status?: number): boolean {
  return status === 400;
}

/** /api/ai/relax-suggestions returns 503 {error:"ai_disabled"} when the AI provider is off. */
export function isAiDisabledStatus(status?: number): boolean {
  return status === 503;
}

export type SalidaGroupState = "loading" | "missing-city" | "ai-disabled" | "error" | "empty" | "ready";

export interface SalidaGroupStatus {
  isLoading: boolean;
  isError: boolean;
  errorStatus?: number;
  eventCount: number;
}

/** Resolves one Salidas group (Actividades / Restaurantes) to its render state. */
export function resolveSalidaGroupState({
  isLoading,
  isError,
  errorStatus,
  eventCount,
}: SalidaGroupStatus): SalidaGroupState {
  if (isLoading) return "loading";
  if (isError) {
    if (isMissingCityStatus(errorStatus)) return "missing-city";
    if (isAiDisabledStatus(errorStatus)) return "ai-disabled";
    return "error";
  }
  return eventCount === 0 ? "empty" : "ready";
}

/** ListRow meta string: "Sáb 9 nov · Teatro Colón"; degrades gracefully when a part is missing. */
export function formatSalidaMeta(event: Pick<RelaxEvent, "dateInfo" | "venue">): string | undefined {
  const parts = [event.dateInfo, event.venue].filter((part) => !!part);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

/** First external link available for a Salida, in priority order, or null. */
export function pickSalidaLink(event: Pick<RelaxEvent, "ticketUrl" | "bookingUrl" | "sourceUrl" | "url">): string | null {
  return event.ticketUrl ?? event.bookingUrl ?? event.sourceUrl ?? event.url ?? null;
}
