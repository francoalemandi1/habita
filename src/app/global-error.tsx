"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="es">
      <body className="flex min-h-screen items-center justify-center bg-background font-sans">
        <div className="mx-auto max-w-md px-4 text-center">
          <div className="mb-4 text-6xl">⚠️</div>
          <h1 className="mb-2 text-2xl font-bold">Algo salió mal</h1>
          <p className="mb-6 text-muted-foreground">
            Ha ocurrido un error inesperado. Por favor, intenta de nuevo.
          </p>
          <button
            onClick={reset}
            className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
