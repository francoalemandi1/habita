"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { storeColors, storeColorFallback, getStoreFaviconUrl } from "@/lib/design-tokens";

interface StoreLogoProps {
  storeName: string;
  /** Tailwind size classes for width/height, e.g. "h-10 w-10" */
  sizeClass: string;
  /** Border radius class — "rounded-full" for circles, "rounded-xl" for cards */
  radiusClass?: string;
  /** Font size class for the letter fallback, e.g. "text-xs" */
  fallbackFontClass?: string;
}

/**
 * Renders a store favicon fetched from Google's S2 API.
 * Falls back to a brand-colored letter avatar if the favicon fails to load.
 */
export function StoreLogo({ storeName, sizeClass, radiusClass = "rounded-full", fallbackFontClass = "text-xs" }: StoreLogoProps): React.JSX.Element {
  const [hasError, setHasError] = useState(false);
  const faviconUrl = getStoreFaviconUrl(storeName);
  const color = storeColors[storeName] ?? storeColorFallback;

  if (!faviconUrl || hasError) {
    return (
      <div
        className={cn("flex shrink-0 items-center justify-center font-bold", sizeClass, radiusClass, fallbackFontClass)}
        style={{ backgroundColor: color.bg, color: color.text }}
      >
        {storeName.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <div className={cn("relative shrink-0 overflow-hidden bg-paper", sizeClass, radiusClass)}>
      {/* Remote favicon: skip the optimizer so no remotePatterns entry is needed */}
      <Image
        src={faviconUrl}
        alt={storeName}
        fill
        sizes="64px"
        unoptimized
        className="object-contain"
        onError={() => setHasError(true)}
      />
    </div>
  );
}
