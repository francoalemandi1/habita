"use client";

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
export function StoreLogo({ storeName, sizeClass, radiusClass = "rounded-full", fallbackFontClass = "text-xs" }: StoreLogoProps) {
  const [hasError, setHasError] = useState(false);
  const faviconUrl = getStoreFaviconUrl(storeName);
  const color = storeColors[storeName] ?? storeColorFallback;

  if (!faviconUrl || hasError) {
    return (
      <div
        className={cn("flex shrink-0 items-center justify-center font-bold", sizeClass, radiusClass)}
        style={{ backgroundColor: color.bg, color: color.text }}
      >
        {storeName.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <div className={cn("shrink-0 overflow-hidden bg-white", sizeClass, radiusClass)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={faviconUrl}
        alt={storeName}
        className="h-full w-full object-contain"
        loading="lazy"
        onError={() => setHasError(true)}
      />
    </div>
  );
}
