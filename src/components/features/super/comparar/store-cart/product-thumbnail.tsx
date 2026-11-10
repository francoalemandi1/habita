"use client";

import { useState } from "react";
import Image from "next/image";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductThumbnailProps {
  imageUrl: string | null;
  size?: "sm" | "md";
}

export function ProductThumbnail({ imageUrl, size = "md" }: ProductThumbnailProps) {
  const [hasError, setHasError] = useState(false);
  const sizeClass = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const iconClass = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  if (!imageUrl || hasError) {
    return (
      <div className={cn("flex shrink-0 items-center justify-center rounded-[14px] bg-sand", sizeClass)}>
        <Package className={cn(iconClass, "text-ink-2")} strokeWidth={1.75} aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className={cn("relative shrink-0 overflow-hidden rounded-[14px] bg-surface", sizeClass)}>
      <Image
        src={imageUrl}
        alt=""
        fill
        sizes="36px"
        unoptimized
        className="object-contain"
        onError={() => setHasError(true)}
      />
    </div>
  );
}
