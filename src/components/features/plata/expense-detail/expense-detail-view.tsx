"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Receipt } from "lucide-react";
import { PLATA_ROUTES } from "@habita/contracts";
import { useSnackbar } from "@/components/ds/snackbar";
import { EditExpenseDialog } from "@/components/features/edit-expense-dialog";
import { apiFetch } from "@/lib/api-client";
import { CATEGORY_ICONS, CATEGORY_LABELS } from "@/lib/expense-constants";
import { buildDebtCallout } from "./expense-detail-logic";
import { DeleteExpenseButton } from "./delete-expense-button";

import type { SerializedExpense } from "@/types/expense";
import type { UpdateExpensePayload } from "@/types/expense";

interface ExpenseDetailViewProps {
  expense: SerializedExpense;
  currentMemberId: string;
  canEdit: boolean;
  hasLaterSettlement: boolean;
  invoice: { id: string; pdfUrl: string | null } | null;
}

function formatArs(amount: number): string {
  return `$${Math.round(amount).toLocaleString("es-AR")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
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
  const snackbar = useSnackbar();
  const [editOpen, setEditOpen] = useState(false);

  const CategoryIcon = CATEGORY_ICONS[expense.category];

  const callout = buildDebtCallout({
    currentMemberId,
    paidById: expense.paidBy.id,
    paidByName: expense.paidBy.name,
    splits: expense.splits.map((split) => ({
      memberId: split.memberId,
      memberName: split.member.name,
      amount: split.amount,
    })),
  });

  const otherSplit = expense.splits.find((split) => split.memberId !== expense.paidBy.id);

  async function handleExpenseUpdated(expenseId: string, payload: UpdateExpensePayload): Promise<void> {
    try {
      await apiFetch(`/api/expenses/${expenseId}`, { method: "PATCH", body: payload });
      router.refresh();
    } catch {
      snackbar.show({ text: "No se pudo guardar", tone: "error" });
    }
  }

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

      <div className="flex flex-col items-start gap-3">
        <span className="flex size-[52px] items-center justify-center rounded-[16px] bg-paper">
          <CategoryIcon className="size-6 text-ink" strokeWidth={1.75} />
        </span>
        <span className="text-[56px] font-bold leading-[.95] tracking-[-.04em] tabular-nums text-ink">
          {formatArs(expense.amount)}
        </span>
        <div className="flex flex-col">
          <span className="text-[17px] font-semibold text-ink">{expense.title}</span>
          <span className="text-[13px] text-ink-2">
            {formatDate(expense.date)} · {CATEGORY_LABELS[expense.category]}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {expense.splits.map((split) => (
          <div key={split.id} className="flex items-center justify-between">
            <span className="text-[15px] text-ink">{split.member.name}</span>
            <span className="text-[15px] font-medium tabular-nums text-ink">{formatArs(split.amount)}</span>
          </div>
        ))}
      </div>

      {callout && (
        <div
          className={`rounded-[12px] px-3.5 py-3 text-[14px] ${
            callout.tone === "monte-soft" ? "bg-monte-soft text-monte" : "bg-ladrillo-soft text-ladrillo-text"
          }`}
        >
          {callout.text}
        </div>
      )}

      {invoice && (
        <a
          href={invoice.pdfUrl ?? PLATA_ROUTES.servicios}
          target={invoice.pdfUrl ? "_blank" : undefined}
          rel={invoice.pdfUrl ? "noreferrer" : undefined}
          className="flex items-center gap-2 text-[14px] text-monte underline underline-offset-[3px]"
        >
          <Receipt className="size-4" strokeWidth={1.75} />
          Ver factura
        </a>
      )}

      {canEdit && (
        <DeleteExpenseButton
          expenseId={expense.id}
          hasLaterSettlement={hasLaterSettlement}
          otherMemberName={otherSplit?.member.name ?? "la otra persona"}
        />
      )}

      {editOpen && (
        <EditExpenseDialog
          expense={expense}
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onExpenseUpdated={handleExpenseUpdated}
        />
      )}
    </div>
  );
}
