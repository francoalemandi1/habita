"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import type { RelaxEvent, RelaxSection } from "@/lib/events/types";

export interface RelaxSuggestionsResponse {
  events: RelaxEvent[];
  summary: string;
  generatedAt: string;
  cached?: boolean;
}

interface UseRelaxSuggestionsOptions {
  section: RelaxSection;
}

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const THIRTY_MINUTES_MS = 30 * 60 * 1000;

/**
 * Query hook for a single Relax section (Planes → Salidas). The household's
 * city resolves server-side (see /api/ai/relax-suggestions) — no geolocation
 * is sent from the client. Mounting the consuming component is what gates
 * the fetch; there is no separate `enabled` flag to manage.
 */
export function useRelaxSuggestions({ section }: UseRelaxSuggestionsOptions) {
  return useQuery<RelaxSuggestionsResponse>({
    queryKey: queryKeys.relax.section(section),
    queryFn: () =>
      apiFetch<RelaxSuggestionsResponse>("/api/ai/relax-suggestions", {
        method: "POST",
        body: { section },
      }),
    staleTime: FIFTEEN_MINUTES_MS,
    gcTime: THIRTY_MINUTES_MS,
  });
}
