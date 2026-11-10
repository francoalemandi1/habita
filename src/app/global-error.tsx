"use client";

import { useEffect } from "react";

// This boundary replaces the entire <html>/<body>, so it cannot rely on
// globals.css (its <link> may not be loaded when the root layout itself
// crashed). Colors are hardcoded to match the §9.1 tokens (paper/ink/monte).
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
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F3EFE7",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <div style={{ margin: "0 auto", maxWidth: "28rem", padding: "0 1rem", textAlign: "center" }}>
          <div style={{ marginBottom: "1rem", fontSize: "3.75rem" }}>⚠️</div>
          <h1 style={{ marginBottom: "0.5rem", fontSize: "1.5rem", fontWeight: 700, color: "#1D2620" }}>
            Algo salió mal
          </h1>
          <p style={{ marginBottom: "1.5rem", color: "#5C665F" }}>
            Ha ocurrido un error inesperado. Por favor, intenta de nuevo.
          </p>
          <button
            onClick={reset}
            style={{
              borderRadius: "0.375rem",
              backgroundColor: "#2E5A45",
              padding: "0.5rem 1.5rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "#F3EFE7",
              border: "none",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#264B3A";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#2E5A45";
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
