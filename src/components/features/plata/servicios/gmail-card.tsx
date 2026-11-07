"use client";

import { Mail, RefreshCw } from "lucide-react";
import { ApiError } from "@habita/api-client";
import { Button } from "@/components/ds/button";
import { useScanGmail } from "@/hooks/use-services";
import { gmailStatusText } from "./servicios-logic";

import type { GmailScanResult } from "@/hooks/use-services";

interface GmailCardProps {
  onScanned: (result: GmailScanResult) => void;
}

/** §5.3 "Servicios" — "Gmail conectado · revisado hoy 7:00" / connect CTA. */
export function GmailCard({ onScanned }: GmailCardProps): React.JSX.Element {
  const scan = useScanGmail();
  const isNotConnected = scan.isError && scan.error instanceof ApiError && scan.error.code === "GMAIL_NOT_CONNECTED";

  async function handleScan(): Promise<void> {
    try {
      const result = await scan.mutateAsync();
      onScanned(result);
    } catch (error) {
      if (error instanceof ApiError && error.code === "GMAIL_NOT_CONNECTED") {
        window.location.href = "/api/gmail/authorize";
      }
    }
  }

  const statusText = scan.isSuccess
    ? gmailStatusText({ connected: true, lastScanAt: new Date().toISOString() }, new Date())
    : isNotConnected
      ? gmailStatusText({ connected: false, lastScanAt: null }, new Date())
      : null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-[16px] bg-surface p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-paper">
          <Mail className="size-[18px] text-ink" strokeWidth={1.75} />
        </span>
        <div className="flex flex-col">
          <span className="text-[15px] font-medium text-ink">
            {statusText ?? "Revisá tu Gmail para detectar facturas"}
          </span>
          {scan.isError && !isNotConnected && (
            <span className="text-[13px] text-ladrillo-text">No se pudo revisar Gmail</span>
          )}
        </div>
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={handleScan}
        loading={scan.isPending}
        loadingLabel="Revisando"
      >
        <RefreshCw className="size-4" strokeWidth={1.75} />
        {isNotConnected ? "Conectar Gmail" : "Revisar"}
      </Button>
    </div>
  );
}
