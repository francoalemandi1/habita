"use client";

interface AnotarHouseholdErrorProps {
  onRetry: () => void;
}

/** Shown when /api/members or /api/members/me fail to load — nothing can be saved without them. */
export function AnotarHouseholdError({ onRetry }: AnotarHouseholdErrorProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3 rounded-[16px] bg-sand p-4">
      <p className="text-[15px] text-ink">No se pudo cargar tu hogar</p>
      <button type="button" onClick={onRetry} className="h-10 self-start rounded-[12px] bg-ink px-4 text-[14px] font-semibold text-paper">
        Reintentar
      </button>
    </div>
  );
}
