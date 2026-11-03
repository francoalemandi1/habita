"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { getSnackbarDuration, replaceSnackbar } from "./lib/snackbar-logic";
import { RAW_COLORS } from "./lib/raw-colors";

import type { SnackbarRequest, SnackbarTone } from "./lib/snackbar-logic";

export type { SnackbarTone };

export type SnackbarActionKind = "undo" | "navigate" | "retry";

export interface SnackbarOptions {
  text: string;
  tone?: SnackbarTone;
  actionKind?: SnackbarActionKind;
  actionLabel?: string;
  onAction?: () => void;
}

interface SnackbarContextValue {
  show: (options: SnackbarOptions) => void;
}

const SnackbarContext = React.createContext<SnackbarContextValue | null>(null);

const ACTION_LABELS: Record<SnackbarActionKind, string> = {
  undo: "Deshacer",
  navigate: "Ver",
  retry: "Reintentar",
};

/** §6.13 colors per action kind — only `undo` maps to an existing token. */
const ACTION_TEXT_STYLE: Record<SnackbarActionKind, React.CSSProperties> = {
  undo: { color: "var(--color-manteca)" },
  navigate: { color: RAW_COLORS.snackbarNavText },
  retry: { color: RAW_COLORS.snackbarErrorText },
};

export function SnackbarProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [current, setCurrent] = React.useState<(SnackbarRequest & SnackbarOptions) | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = React.useCallback(() => {
    setCurrent(null);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const show = React.useCallback((options: SnackbarOptions) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const next = { id: crypto.randomUUID(), ...options };
    setCurrent((prevState) => replaceSnackbar(prevState, next));
    timerRef.current = setTimeout(dismiss, getSnackbarDuration(options.tone));
  }, [dismiss]);

  React.useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const value = React.useMemo(() => ({ show }), [show]);

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      {current && <SnackbarView request={current} onDismiss={dismiss} />}
    </SnackbarContext.Provider>
  );
}

function SnackbarView({
  request,
  onDismiss,
}: {
  request: SnackbarRequest & SnackbarOptions;
  onDismiss: () => void;
}): React.JSX.Element {
  const actionLabel = request.actionLabel ?? (request.actionKind ? ACTION_LABELS[request.actionKind] : undefined);

  return (
    <div
      role="status"
      className={cn(
        "fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-sm items-center justify-between gap-3 rounded-[14px] bg-ink py-3 pl-4 pr-3 text-paper shadow-level-2",
        "animate-[fade-in_260ms_cubic-bezier(.2,0,0,1)]"
      )}
    >
      <p className="text-[14px]">{request.text}</p>
      {actionLabel && request.onAction && (
        <button
          type="button"
          onClick={() => {
            request.onAction?.();
            onDismiss();
          }}
          style={request.actionKind ? ACTION_TEXT_STYLE[request.actionKind] : undefined}
          className="shrink-0 text-[14px] font-semibold"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function useSnackbar(): SnackbarContextValue {
  const context = React.useContext(SnackbarContext);
  if (!context) {
    throw new Error("useSnackbar must be used within a SnackbarProvider");
  }
  return context;
}
