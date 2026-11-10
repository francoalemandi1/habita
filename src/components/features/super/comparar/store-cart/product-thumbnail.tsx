"use client";

import { useState } from "react";
import Image from "next/image";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductThumbnailProps {
  imageUrl: string | null;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES: Record<"sm" | "md" | "lg", string> = { sm: "h-7 w-7", md: "h-9 w-9", lg: "h-12 w-12" };
const ICON_CLASSES: Record<"sm" | "md" | "lg", string> = { sm: "h-3 w-3", md: "h-4 w-4", lg: "h-5 w-5" };

export function ProductThumbnail({ imageUrl, size = "md" }: ProductThumbnailProps) {
  const [hasError, setHasError] = useState(false);
  const sizeClass = SIZE_CLASSES[size];
  const iconClass = ICON_CLASSES[size];

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
