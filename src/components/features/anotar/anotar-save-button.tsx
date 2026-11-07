"use client";

interface AnotarSaveButtonProps {
  label: string;
  savingLabel: string;
  isSaving: boolean;
  disabled?: boolean;
  error: string | null;
  onClick: () => void;
}

/** §7 pattern B — Tinta CTA; on error the sheet stays open and the message sits above the button. */
export function AnotarSaveButton({ label, savingLabel, isSaving, disabled, error, onClick }: AnotarSaveButtonProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-[13px] text-ladrillo-text">{error}</p>}
      <button
        type="button"
        onClick={onClick}
        disabled={isSaving || disabled}
        className="h-12 rounded-[14px] bg-ink text-[15px] font-semibold text-paper disabled:bg-line disabled:text-ink-3"
      >
        {isSaving ? savingLabel : label}
      </button>
    </div>
  );
}
