"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/toast";
import { ArrowRightLeft, Check, X } from "lucide-react";

interface Transfer {
  id: string;
  reason: string | null;
  status: string;
  requestedAt: Date | string;
  assignment: {
    task: {
      id: string;
      name: string;
    };
  };
  fromMember: {
    id: string;
    name: string;
  };
  toMember: {
    id: string;
    name: string;
  };
}

interface PendingTransfersProps {
  transfers: Transfer[];
  currentMemberId: string;
}

function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "ahora";
  if (diffMins < 60) return `hace ${diffMins} min`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays === 1) return "ayer";
  return `hace ${diffDays} días`;
}

export function PendingTransfers({ transfers, currentMemberId }: PendingTransfersProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [rejectConfirm, setRejectConfirm] = useState<Transfer | null>(null);
  const router = useRouter();
  const toast = useToast();

  const pendingTransfers = transfers.filter((t) => t.status === "PENDING");
  const incomingTransfers = pendingTransfers.filter((t) => t.toMember.id === currentMemberId);
  const outgoingTransfers = pendingTransfers.filter((t) => t.fromMember.id === currentMemberId);

  const handleRespond = async (transferId: string, action: "ACCEPT" | "REJECT") => {
    setLoadingId(transferId);
    try {
      const response = await fetch(`/api/transfers/${transferId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        if (action === "ACCEPT") {
          toast.success("Transferencia aceptada", "La tarea ha sido asignada a ti");
        } else {
          toast.info("Transferencia rechazada", "La tarea sigue asignada al solicitante");
        }
        router.refresh();
      } else {
        toast.error("Error", "No se pudo procesar la transferencia");
      }
    } finally {
      setLoadingId(null);
      setRejectConfirm(null);
    }
  };

  const handleCancel = async (transferId: string) => {
    setLoadingId(transferId);
    try {
      const response = await fetch(`/api/transfers/${transferId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.refresh();
      }
    } finally {
      setLoadingId(null);
    }
  };

  if (pendingTransfers.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ArrowRightLeft className="h-5 w-5" />
          Transferencias pendientes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Incoming transfers */}
        {incomingTransfers.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-medium text-muted-foreground">
              Solicitudes recibidas
            </h4>
            <div className="space-y-2">
              {incomingTransfers.map((transfer) => (
                <div
                  key={transfer.id}
                  className="flex flex-col gap-3 rounded-2xl border border-yellow-500/50 bg-yellow-50/50 p-3 dark:bg-yellow-950/20 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{transfer.assignment.task.name}</p>
                    <p className="text-sm text-muted-foreground">
                      De {transfer.fromMember.name} · {formatRelativeTime(transfer.requestedAt)}
                    </p>
                    {transfer.reason && (
                      <p className="mt-1 text-sm italic text-muted-foreground">
                        &quot;{transfer.reason}&quot;
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRejectConfirm(transfer)}
                      disabled={loadingId === transfer.id}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleRespond(transfer.id, "ACCEPT")}
                      disabled={loadingId === transfer.id}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Outgoing transfers */}
        {outgoingTransfers.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-medium text-muted-foreground">
              Solicitudes enviadas
            </h4>
            <div className="space-y-2">
              {outgoingTransfers.map((transfer) => (
                <div
                  key={transfer.id}
                  className="flex flex-col gap-3 rounded-2xl border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{transfer.assignment.task.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Para {transfer.toMember.name} · {formatRelativeTime(transfer.requestedAt)}
                    </p>
                    <Badge variant="outline" className="mt-1">
                      Esperando respuesta
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCancel(transfer.id)}
                    disabled={loadingId === transfer.id}
                    className="shrink-0 self-start sm:self-center"
                  >
                    Cancelar
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* Reject confirmation dialog */}
      <AlertDialog open={!!rejectConfirm} onOpenChange={(open) => !open && setRejectConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rechazar transferencia</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de rechazar la tarea &quot;{rejectConfirm?.assignment.task.name}&quot;
              de {rejectConfirm?.fromMember.name}? La tarea seguirá asignada a quien la solicitó.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!loadingId}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => rejectConfirm && handleRespond(rejectConfirm.id, "REJECT")}
              disabled={!!loadingId}
            >
              {loadingId ? "Rechazando..." : "Rechazar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
