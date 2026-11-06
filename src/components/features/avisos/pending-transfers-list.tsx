"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { ListRow } from "@/components/ds/list-row";
import { useSnackbar } from "@/components/ds/snackbar";
import { apiFetch } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@habita/contracts";

export interface PendingTransferAviso {
  id: string;
  taskName: string;
  fromMemberName: string;
}

interface PendingTransfersListProps {
  transfers: readonly PendingTransferAviso[];
}

/** Pending transfer requests sent TO the current member — accept/reject lives in Avisos (handoff: transfers alias). */
export function PendingTransfersList({ transfers }: PendingTransfersListProps): React.JSX.Element | null {
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const snackbar = useSnackbar();
  const queryClient = useQueryClient();

  const visible = transfers.filter((t) => !resolvedIds.has(t.id));
  if (visible.length === 0) return null;

  async function respond(transferId: string, action: "ACCEPT" | "REJECT"): Promise<void> {
    setLoadingId(transferId);
    try {
      await apiFetch(`/api/transfers/${transferId}`, { method: "PATCH", body: { action } });
      setResolvedIds((prev) => new Set(prev).add(transferId));
      await queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all() });
      snackbar.show({ text: action === "ACCEPT" ? "Tarea aceptada" : "Tarea rechazada" });
    } catch (error) {
      console.warn("No se pudo responder la transferencia", error);
      snackbar.show({ text: "No se pudo responder el pedido", tone: "error" });
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="mb-4 rounded-[16px] bg-surface px-1">
      {visible.map((transfer) => (
        <ListRow
          key={transfer.id}
          title={transfer.taskName}
          meta={`${transfer.fromMemberName} te quiere pasar esta tarea`}
          trailing={
            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                aria-label="Rechazar"
                disabled={loadingId === transfer.id}
                onClick={() => respond(transfer.id, "REJECT")}
                className="flex size-9 items-center justify-center rounded-full bg-sand text-ink"
              >
                <X className="size-4" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                aria-label="Aceptar"
                disabled={loadingId === transfer.id}
                onClick={() => respond(transfer.id, "ACCEPT")}
                className="flex size-9 items-center justify-center rounded-full bg-monte text-paper"
              >
                <Check className="size-4" strokeWidth={1.75} />
              </button>
            </div>
          }
        />
      ))}
    </div>
  );
}
