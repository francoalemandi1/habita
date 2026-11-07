import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@habita/api-client";
import { parseEntryResponseSchema } from "@habita/contracts";
import type { ParseEntryResponse } from "@habita/contracts";
import { mobileApi } from "@/lib/api";
import { PARSE_DEBOUNCE_MS, PARSE_TIMEOUT_MS, isStaleParseResponse, shouldParse } from "@/lib/anotar-parse-logic";

export type AnotarParseStatus = "idle" | "parsing" | "parsed" | "unavailable" | "rate_limited";

interface UseAnotarParseOptions {
  /** Fired once per successful parse — the caller applies it directly, no derived-state effect. */
  onResult: (result: ParseEntryResponse) => void;
}

interface UseAnotarParseResult {
  status: AnotarParseStatus;
  /** Re-runs the parse immediately, bypassing the debounce (used by the Composer's send button). */
  parseNow: (text: string) => void;
}

/** §5.3 Global "Anotar" — debounced live parse via POST /api/ai/parse-entry, latest-wins. */
export function useAnotarParse(text: string, enabled: boolean, { onResult }: UseAnotarParseOptions): UseAnotarParseResult {
  const [status, setStatus] = useState<AnotarParseStatus>("idle");
  const lastParsedRef = useRef<string | null>(null);
  const latestTextRef = useRef(text);
  latestTextRef.current = text;
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const runParse = useCallback(async (requestedText: string) => {
    const trimmed = requestedText.trim();
    lastParsedRef.current = trimmed;
    setStatus("parsing");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PARSE_TIMEOUT_MS);

    try {
      const raw = await mobileApi.post<unknown>(
        "/api/ai/parse-entry",
        { text: trimmed },
        { signal: controller.signal },
      );
      if (isStaleParseResponse(trimmed, latestTextRef.current)) return;

      const parsed = parseEntryResponseSchema.safeParse(raw);
      if (!parsed.success) {
        console.warn("useAnotarParse: invalid parse-entry response", parsed.error);
        setStatus("unavailable");
        return;
      }
      setStatus("parsed");
      onResultRef.current(parsed.data);
    } catch (error) {
      if (isStaleParseResponse(trimmed, latestTextRef.current)) return;
      if (error instanceof ApiError && error.status === 429) {
        setStatus("rate_limited");
        return;
      }
      setStatus("unavailable");
    } finally {
      clearTimeout(timeoutId);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    if (!shouldParse(text, lastParsedRef.current)) return undefined;

    const timer = setTimeout(() => void runParse(text), PARSE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, enabled, runParse]);

  const parseNow = useCallback(
    (requestedText: string) => void runParse(requestedText),
    [runParse],
  );

  return { status, parseNow };
}
