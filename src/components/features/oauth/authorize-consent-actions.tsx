"use client";

import { useState } from "react";
import { Button } from "@/components/ds";

interface AuthorizeConsentActionsProps {
  params: Record<string, string | undefined>;
}

interface AuthorizeDecisionResponse {
  redirectUrl: string;
}

function isAuthorizeDecisionResponse(value: unknown): value is AuthorizeDecisionResponse {
  return typeof value === "object" && value !== null && typeof (value as { redirectUrl?: unknown }).redirectUrl === "string";
}

async function submitDecision(decision: "approve" | "deny", params: Record<string, string | undefined>): Promise<string> {
  const response = await fetch("/api/oauth/authorize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision, ...params }),
  });

  const json: unknown = await response.json();
  if (!response.ok || !isAuthorizeDecisionResponse(json)) {
    throw new Error("No pudimos procesar tu respuesta. Probá de nuevo.");
  }

  return json.redirectUrl;
}

export function AuthorizeConsentActions({ params }: AuthorizeConsentActionsProps): React.JSX.Element {
  const [pendingDecision, setPendingDecision] = useState<"approve" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleDecision(decision: "approve" | "deny"): void {
    setError(null);
    setPendingDecision(decision);

    submitDecision(decision, params)
      .then((redirectUrl) => {
        window.location.assign(redirectUrl);
      })
      .catch(() => {
        setPendingDecision(null);
        setError("No pudimos procesar tu respuesta. Probá de nuevo.");
      });
  }

  function handleApproveClick(): void {
    handleDecision("approve");
  }

  function handleDenyClick(): void {
    handleDecision("deny");
  }

  return (
    <div className="flex w-full flex-col gap-3">
      {error && <p className="text-center text-[14px] text-ladrillo">{error}</p>}

      <Button
        size="default"
        className="w-full"
        loading={pendingDecision === "approve"}
        loadingLabel="Autorizando…"
        disabled={pendingDecision !== null}
        onClick={handleApproveClick}
      >
        Autorizar
      </Button>

      <Button
        variant="secondary"
        size="default"
        className="w-full"
        loading={pendingDecision === "deny"}
        loadingLabel="Cancelando…"
        disabled={pendingDecision !== null}
        onClick={handleDenyClick}
      >
        Cancelar
      </Button>
    </div>
  );
}
