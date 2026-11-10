import { Pin, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CartActionsProps {
  storeName: string;
  isPinned?: boolean;
  onPinStore?: (storeName: string) => void;
  shareLabel: string | null;
  onShare: () => void;
}

export function CartActions({ storeName, isPinned, onPinStore, shareLabel, onShare }: CartActionsProps) {
  return (
    <div className="flex items-center gap-2 px-4 pb-3">
      {onPinStore && (
        <button
          type="button"
          onClick={() => onPinStore(storeName)}
          className={cn(
            "flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monte",
            isPinned ? "bg-monte-soft text-monte" : "bg-sand text-ink-2 hover:bg-line-soft hover:text-ink",
          )}
        >
          <Pin className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />
          Mi super
        </button>
      )}
      <button
        type="button"
        onClick={onShare}
        className="flex min-h-9 items-center gap-1.5 rounded-full bg-sand px-3 py-1.5 text-xs font-medium text-ink-2 transition-colors hover:bg-line-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monte"
      >
        <Share2 className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />
        {shareLabel ?? "Compartir"}
      </button>
    </div>
  );
}
