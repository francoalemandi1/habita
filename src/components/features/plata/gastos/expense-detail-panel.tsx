"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Skeleton } from "@/components/ds/skeleton";
import { Button } from "@/components/ds/button";
import { ExpenseDetailBody } from "@/components/features/plata/expense-detail/expense-detail-body";
import { expenseDetailQueryOptions, useExpenseDetail } from "@/hooks/use-expense-detail";

interface ExpenseDetailPanelProps {
  expenseId: string | null;
  currentMemberId: string;
  onClose: () => void;
}

/** Desktop Gastos split-panel (handoff §5.3 "web: lista + panel de detalle de 440"). */
export function ExpenseDetailPanel({ expenseId, currentMemberId, onClose }: ExpenseDetailPanelProps): React.JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const { data, isLoading, isError, refetch } = useExpenseDetail(expenseId);

  function handleUpdated(): void {
    if (expenseId) {
      void queryClient.invalidateQueries({ queryKey: expenseDetailQueryOptions(expenseId).queryKey });
    }
    router.refresh();
  }

  function handleDeleted(): void {
    onClose();
    router.refresh();
  }

  if (!expenseId) {
    return (
      <div className="flex items-center justify-center px-6 py-16 text-center">
        <p className="text-[14px] text-ink-2">Elegí un gasto para ver cómo se dividió.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-5 py-4">
      <div className="flex items-center justify-between">
        {data?.canEdit ? (
          <button type="button" onClick={() => setEditOpen(true)} className="text-[15px] font-medium text-monte">
            Editar
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar detalle"
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors duration-100 hover:bg-paper"
        >
          <X className="size-5" strokeWidth={1.75} />
        </button>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-3">
          <Skeleton className="size-[52px] rounded-[16px]" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {isError && !isLoading && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-[14px] text-ink-2">No se pudo cargar el detalle.</p>
          <Button variant="secondary" size="sm" onClick={() => void refetch()}>
            Reintentar
          </Button>
        </div>
      )}

      {data && !isLoading && !isError && (
        <ExpenseDetailBody
          expense={data.expense}
          currentMemberId={currentMemberId}
          canEdit={data.canEdit}
          hasLaterSettlement={data.hasLaterSettlement}
          invoice={data.invoice}
          editOpen={editOpen}
          onEditOpenChange={setEditOpen}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
