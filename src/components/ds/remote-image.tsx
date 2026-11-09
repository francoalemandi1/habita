"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface RemoteImageProps {
  src: string;
  alt: string;
  className?: string;
  /** Shown when the third-party image fails (dead links are common in scraped events). */
  fallback?: React.ReactNode;
}

/**
 * Third-party images (events, products) of unknown hosts: rendered unoptimized so no
 * remotePatterns allowlist is needed, lazy, and swapped for a fallback when they 404.
 */
export function RemoteImage({ src, alt, className, fallback = null }: RemoteImageProps): React.JSX.Element {
  const [hasFailed, setHasFailed] = useState(false);
  if (hasFailed) return <>{fallback}</>;

  return (
    <Image
      src={src}
      alt={alt}
      fill
      unoptimized
      loading="lazy"
      sizes="(min-width: 768px) 320px, 100vw"
      onError={() => setHasFailed(true)}
      className={cn("object-cover", className)}
    />
  );
}
