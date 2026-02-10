"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface BackButtonProps {
  children?: React.ReactNode;
  className?: string;
}

/**
 * Botón "Volver" que navega a la página anterior con router.back().
 * Misma UX en toda la app: un solo método back, sin rutas fijas.
 */
export function BackButton({
  children = "Volver",
  className,
}: BackButtonProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className={cn(
        "mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground",
        className
      )}
    >
      <ArrowLeft className="h-4 w-4" />
      {children}
    </button>
  );
}
