"use client";

import { useEffect } from "react";
import { HabitaLogo } from "@/components/ds";

interface MobileJoinRedirectProps {
  householdName: string;
  deepLink: string;
  storeUrl: string;
  platform: "ios" | "android";
}

/**
 * Attempts to open the Habita app via custom scheme deep link.
 * If the app is not installed (or doesn't open within 1.5s), redirects to the store.
 */
export function MobileJoinRedirect({
  householdName,
  deepLink,
  storeUrl,
  platform,
}: MobileJoinRedirectProps) {
  useEffect(() => {
    window.location.href = deepLink;

    const timeout = setTimeout(() => {
      window.location.href = storeUrl;
    }, 1500);

    const handleVisibilityChange = () => {
      if (document.hidden) clearTimeout(timeout);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [deepLink, storeUrl]);

  const storeLabel = platform === "ios" ? "App Store" : "Google Play";

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4 py-8">
      <div className="w-full rounded-2xl bg-surface p-6 sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4">
            <HabitaLogo size={64} />
          </div>
          <h1 className="text-[22px] font-bold tracking-[-0.02em] text-ink">Unite a {householdName}</h1>
          <p className="mt-2 text-ink-2">Abriendo Habita…</p>
        </div>

        <p className="mb-4 text-center text-[13px] text-ink-2">¿No tenés la app instalada?</p>
        <a href={storeUrl} className="block w-full rounded-[12px] bg-monte px-4 py-3 text-center text-[15px] font-semibold text-paper">
          Descargar desde {storeLabel}
        </a>
        <a href={deepLink} className="mt-3 block w-full rounded-[12px] border border-line px-4 py-3 text-center text-[15px] font-semibold text-ink">
          Abrir la app
        </a>
      </div>
    </div>
  );
}
