"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface SaveButtonProps {
  isSaved: boolean;
  isPending: boolean;
  onToggle: () => void;
  className?: string;
  size?: "sm" | "md";
}

export function SaveButton({
  isSaved,
  isPending,
  onToggle,
  className,
  size = "sm",
}: SaveButtonProps): React.JSX.Element {
  const iconSize = size === "sm" ? 16 : 20;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onToggle();
      }}
      disabled={isPending}
      aria-label={isSaved ? "Quitar de guardados" : "Guardar"}
      className={cn(
        "rounded-full p-1.5 transition-colors",
        "hover:bg-sand disabled:opacity-50",
        isSaved ? "text-monte" : "text-ink-2 hover:text-ink",
        className,
      )}
    >
      {isSaved ? (
        <BookmarkCheck size={iconSize} className="fill-current" strokeWidth={1.75} />
      ) : (
        <Bookmark size={iconSize} strokeWidth={1.75} />
      )}
    </button>
  );
}
