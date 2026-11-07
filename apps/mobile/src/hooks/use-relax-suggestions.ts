import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { mobileApi } from "@/lib/api";

export type RelaxSection = "activities" | "restaurants";

const relaxEventSchema = z.object({
  id: z.string().nullable(),
  title: z.string(),
  venue: z.string(),
  dateInfo: z.string(),
  url: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  ticketUrl: z.string().nullable(),
  bookingUrl: z.string().nullable(),
});

const relaxSuggestionsResponseSchema = z.object({
  events: z.array(relaxEventSchema),
  summary: z.string(),
  generatedAt: z.string(),
  cached: z.boolean().optional(),
});

export type RelaxEvent = z.infer<typeof relaxEventSchema>;
export type RelaxSuggestionsResponse = z.infer<typeof relaxSuggestionsResponseSchema>;

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const THIRTY_MINUTES_MS = 30 * 60 * 1000;

interface UseRelaxSuggestionsOptions {
  section: RelaxSection;
}

/**
 * Query hook for a single Relax section (Planes → Salidas). The household's
 * city resolves server-side (see /api/ai/relax-suggestions) — no geolocation
 * is sent from the client. Mounting the consuming screen gates the fetch.
 */
export function useRelaxSuggestions({ section }: UseRelaxSuggestionsOptions) {
  return useQuery<RelaxSuggestionsResponse>({
    queryKey: ["relax", section] as const,
    queryFn: async () => {
      const raw = await mobileApi.post<unknown>("/api/ai/relax-suggestions", { section });
      const parsed = relaxSuggestionsResponseSchema.safeParse(raw);
      if (!parsed.success) {
        console.warn("useRelaxSuggestions: invalid response", parsed.error);
        throw new Error("Respuesta inválida de relax-suggestions");
      }
      return parsed.data;
    },
    staleTime: FIFTEEN_MINUTES_MS,
    gcTime: THIRTY_MINUTES_MS,
  });
}
