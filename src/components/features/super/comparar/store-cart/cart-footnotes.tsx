import { AlertCircle } from "lucide-react";
import { formatPrice } from "./helpers";

interface CartFootnotesProps {
  missingTerms: string[];
  savingsAmount: number;
  isBest: boolean;
}

export function CartFootnotes({ missingTerms, savingsAmount, isBest }: CartFootnotesProps) {
  return (
    <>
      {missingTerms.length > 0 && (
        <div className="mx-4 mb-3 flex items-start gap-2 rounded-[14px] bg-manteca-soft px-3 py-2">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-manteca-text" strokeWidth={1.75} aria-hidden="true" />
          <div>
            <p className="text-xs font-medium text-manteca-text">No encontrado</p>
            <p className="text-[11px] text-manteca-text">
              {missingTerms.join(", ")}
            </p>
          </div>
        </div>
      )}

      {savingsAmount > 0 && isBest && (
        <div className="mx-4 mb-3 rounded-[14px] bg-monte-soft px-3 py-2">
          <p className="text-xs font-medium text-monte">
            Ahorrás {formatPrice(savingsAmount)} comprando acá vs el promedio del mercado
          </p>
        </div>
      )}
    </>
  );
}
