"use client";

import { useEffect } from "react";
import { HabitaLogo } from "@/components/ui/habita-logo";

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
    // Try to open the app
    window.location.href = deepLink;

    // If the app doesn't open within 1.5s, assume it's not installed → go to store
    const timeout = setTimeout(() => {
      window.location.href = storeUrl;
    }, 1500);

    // If the page goes into background (app opened), cancel the store redirect
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
    <div className="rounded-2xl border-2 border-border/60 bg-card p-6 shadow-lg sm:p-8">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4">
          <HabitaLogo size={64} className="rounded-2xl" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          Unite a {householdName}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Abriendo Habita…
        </p>
      </div>

      <p className="mb-4 text-center text-sm text-muted-foreground">
        ¿No tenés la app instalada?
      </p>
      <a
        href={storeUrl}
        className="block w-full rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground"
      >
        Descargar desde {storeLabel}
      </a>
      <a
        href={deepLink}
        className="mt-3 block w-full rounded-xl border border-border px-4 py-3 text-center text-sm font-semibold text-foreground"
      >
        Abrir la app
      </a>
    </div>
  );
}
