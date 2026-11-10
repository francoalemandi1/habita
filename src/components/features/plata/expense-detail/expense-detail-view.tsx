"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ExpenseDetailBody } from "./expense-detail-body";

import type { SerializedExpense } from "@/types/expense";

interface ExpenseDetailViewProps {
  expense: SerializedExpense;
  currentMemberId: string;
  canEdit: boolean;
  hasLaterSettlement: boolean;
  invoice: { id: string; pdfUrl: string | null } | null;
}

/** Expense detail (level 1), handoff §5.3 "Plata" — "Detalle de gasto". */
export function ExpenseDetailView({
  expense,
  currentMemberId,
  canEdit,
  hasLaterSettlement,
  invoice,
}: ExpenseDetailViewProps): React.JSX.Element {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6 px-5 py-4">
      <div className="flex items-center justify-between">
        <Link href="/plata" className="flex items-center gap-1 text-monte">
          <ChevronLeft className="size-5" strokeWidth={1.75} />
          <span className="text-[16px] font-medium">Plata</span>
        </Link>
        {canEdit && (
          <button type="button" onClick={() => setEditOpen(true)} className="text-[15px] font-medium text-monte">
            Editar
          </button>
        )}
      </div>

      <ExpenseDetailBody
        expense={expense}
        currentMemberId={currentMemberId}
        canEdit={canEdit}
        hasLaterSettlement={hasLaterSettlement}
        invoice={invoice}
        editOpen={editOpen}
        onEditOpenChange={setEditOpen}
        onUpdated={() => router.refresh()}
        onDeleted={() => router.push("/plata")}
      />
    </div>
  );
}
