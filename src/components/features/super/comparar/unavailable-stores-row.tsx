import { WifiOff } from "lucide-react";
import { StoreChip } from "@/components/ds/store-chip";

interface UnavailableStoresRowProps {
  stores: string[];
}

/** Stores that didn't respond to the search — shown as "No respondió", never as "falta todo". */
export function UnavailableStoresRow({ stores }: UnavailableStoresRowProps): React.JSX.Element | null {
  if (stores.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-[12px] bg-sand px-3.5 py-3">
      <div className="flex items-center gap-1.5 text-[13px] text-ink-2">
        <WifiOff className="size-3.5" strokeWidth={1.75} />
        No respondió
      </div>
      <div className="flex flex-wrap gap-1.5">
        {stores.map((store) => (
          <StoreChip key={store} store={store} className="opacity-50" />
        ))}
      </div>
    </div>
  );
}
