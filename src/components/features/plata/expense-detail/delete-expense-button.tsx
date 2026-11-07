"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ds/button";
import { Dialog } from "@/components/ds/dialog";
import { useSnackbar } from "@/components/ds/snackbar";
import { cancelDelete, scheduleDelete } from "@/lib/deferred-delete";

const DEFERRED_DELETE_MS = 5000;

interface DeleteExpenseButtonProps {
  expenseId: string;
  hasLaterSettlement: boolean;
  otherMemberName: string;
}

async function deleteExpense(expenseId: string): Promise<boolean> {
  const response = await fetch(`/api/expenses/${expenseId}`, { method: "DELETE", keepalive: true });
  return response.ok;
}

/** "Eliminar gasto" — pattern A (deferred) when open, pattern D (confirm dialog) once liquidated. */
export function DeleteExpenseButton({
  expenseId,
  hasLaterSettlement,
  otherMemberName,
}: DeleteExpenseButtonProps): React.JSX.Element {
  const router = useRouter();
  const snackbar = useSnackbar();
  const [dialogOpen, setDialogOpen] = useState(false);

  function showError(retry: () => void): void {
    snackbar.show({ text: "No se pudo eliminar", tone: "error", actionKind: "retry", onAction: retry });
  }

  function handleDeleteA(): void {
    scheduleDelete({
      id: expenseId,
      delayMs: DEFERRED_DELETE_MS,
      run: () => {
        deleteExpense(expenseId)
          .then((ok) => {
            if (!ok) throw new Error("delete failed");
            router.refresh();
          })
          .catch(() => showError(handleDeleteA));
      },
    });

    snackbar.show({ text: "Gasto eliminado", actionKind: "undo", onAction: () => cancelDelete(expenseId) });
    router.push("/plata");
  }

  function handleDeleteD(): void {
    setDialogOpen(false);
    deleteExpense(expenseId)
      .then((ok) => {
        if (!ok) throw new Error("delete failed");
        snackbar.show({ text: "Gasto eliminado" });
        router.push("/plata");
      })
      .catch(() => showError(handleDeleteD));
  }

  if (hasLaterSettlement) {
    return (
      <>
        <Button variant="link" onClick={() => setDialogOpen(true)} className="text-ladrillo">
          <Trash2 className="size-4" strokeWidth={1.75} />
          Eliminar gasto
        </Button>
        <Dialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title="¿Eliminar este gasto?"
          body={`Esto reabre los saldos entre Vos y ${otherMemberName}.`}
          confirmLabel="Eliminar"
          confirmTone="destructive"
          onConfirm={handleDeleteD}
        />
      </>
    );
  }

  return (
    <Button variant="link" onClick={handleDeleteA} className="text-ladrillo">
      <Trash2 className="size-4" strokeWidth={1.75} />
      Eliminar gasto
    </Button>
  );
}
