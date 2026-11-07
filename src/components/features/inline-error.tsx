"use client";

interface InlineErrorProps {
  message: string;
  onRetry: () => void;
}

/** Inline error + "Reintentar" for data-driven sections (handoff §7 — never a blank area or a raw error string). */
export function InlineError({ message, onRetry }: InlineErrorProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3 rounded-[16px] bg-ladrillo-soft p-4">
      <p className="text-[14px] text-ladrillo-text">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="h-9 self-start rounded-[12px] bg-surface px-3.5 text-[13px] font-semibold text-ink"
      >
        Reintentar
      </button>
    </div>
  );
}
