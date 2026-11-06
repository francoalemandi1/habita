"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { parseEntryResponseSchema } from "@habita/contracts";
import { createRequestSequencer, shouldTriggerParse } from "@/lib/anotar-parse-trigger";
import { classifyParseError } from "@/lib/anotar-ai-error";

import type { ParseEntryResponse } from "@habita/contracts";
import type { AnotarAiOutcome } from "@/lib/anotar-ai-error";

const PARSE_TIMEOUT_MS = 8_000;

export interface AnotarParseState {
  status: "idle" | "loading" | "parsed";
  result: ParseEntryResponse | null;
  outcome: AnotarAiOutcome | null;
}

export interface UseAnotarParseHandlers {
  /** Called with the latest (non-stale) successful parse — drive the draft state from here, not from an effect. */
  onResult: (result: ParseEntryResponse) => void;
  /** Called with the latest (non-stale) failure's classified outcome. */
  onError: (outcome: AnotarAiOutcome) => void;
}

const IDLE_STATE: AnotarParseState = { status: "idle", result: null, outcome: null };

/** Debounced, stale-response-safe client for POST /api/ai/parse-entry (handoff §6.22). */
export function useAnotarParse(handlers: UseAnotarParseHandlers): {
  state: AnotarParseState;
  parse: (text: string) => void;
  reset: () => void;
} {
  const [state, setState] = useState<AnotarParseState>(IDLE_STATE);
  const sequencerRef = useRef(createRequestSequencer());
  const lastParsedTextRef = useRef<string | null>(null);

  // `parse()` can settle several renders after it was called; this ref keeps
  // it invoking the latest handlers instead of the ones from the call site's render.
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  const parse = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!shouldTriggerParse(trimmed, lastParsedTextRef.current)) return;
    lastParsedTextRef.current = trimmed;

    const requestId = sequencerRef.current.next();
    setState((prev) => ({ ...prev, status: "loading" }));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PARSE_TIMEOUT_MS);

    void apiFetch<unknown>("/api/ai/parse-entry", {
      method: "POST",
      body: { text: trimmed },
      signal: controller.signal,
    })
      .then((raw) => {
        if (!sequencerRef.current.isLatest(requestId)) return;
        const parsed = parseEntryResponseSchema.safeParse(raw);
        if (!parsed.success) {
          console.warn("useAnotarParse: invalid parse-entry response", parsed.error);
          setState({ status: "parsed", result: null, outcome: "network-error" });
          handlersRef.current.onError("network-error");
          return;
        }
        setState({ status: "parsed", result: parsed.data, outcome: null });
        handlersRef.current.onResult(parsed.data);
      })
      .catch((error: unknown) => {
        if (!sequencerRef.current.isLatest(requestId)) return;
        const isAbort = error instanceof DOMException && error.name === "AbortError";
        const status = error instanceof ApiError ? error.status : undefined;
        const outcome = classifyParseError({ status, isAbort });
        setState({ status: "parsed", result: null, outcome });
        handlersRef.current.onError(outcome);
      })
      .finally(() => clearTimeout(timeoutId));
  }, []);

  const reset = useCallback(() => {
    lastParsedTextRef.current = null;
    sequencerRef.current = createRequestSequencer();
    setState(IDLE_STATE);
  }, []);

  return { state, parse, reset };
}
