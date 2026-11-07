"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Wallet } from "lucide-react";
import { Toggle } from "@/components/ds/toggle";
import { useFund } from "@/hooks/use-fund";
import { describeCustomSplit, isFundToggleVisible, resolveChargeToFund, summarizeCustomSplit } from "@/lib/anotar-expense-logic";
import { cn } from "@/lib/utils";

import type { MemberSummary } from "@habita/contracts";
import type { CustomSplitTone } from "@/lib/anotar-expense-logic";
import type { ExpenseDraft } from "./anotar-draft-types";

const SPLIT_TONE_CLASS: Record<CustomSplitTone, string> = {
  balanced: "text-monte",
  over: "text-ladrillo-text",
  under: "text-ink-2",
};

interface AnotarExpenseMoreOptionsProps {
  draft: ExpenseDraft;
  onChange: (next: ExpenseDraft) => void;
  members: MemberSummary[];
}

/** §5.3 Global "Anotar" — collapsed "Más opciones": custom split, fondo común, nota. */
export function AnotarExpenseMoreOptions({ draft, onChange, members }: AnotarExpenseMoreOptionsProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const { data: fund } = useFund();
  const fundToggleVisible = isFundToggleVisible(fund, draft.category);
  const resolvedChargeToFund = resolveChargeToFund(draft.chargeToFund, fundToggleVisible);
  const splitStatus = describeCustomSplit(summarizeCustomSplit(draft.amount, draft.customSplits, draft.participantIds));

  function setCustomAmount(memberId: string, value: string): void {
    onChange({ ...draft, customSplits: { ...draft.customSplits, [memberId]: value } });
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="inline-flex items-center gap-1 self-start text-[13px] font-medium text-ink-2"
      >
        {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        Más opciones
      </button>

      {expanded && (
        <div className="flex flex-col gap-3">
          {!resolvedChargeToFund && (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => onChange({ ...draft, splitType: draft.splitType === "CUSTOM" ? "EQUAL" : "CUSTOM" })}
                className={cn(
                  "inline-flex h-[30px] w-fit items-center rounded-full px-3 text-[13px] font-medium",
                  draft.splitType === "CUSTOM" ? "bg-ink text-paper" : "bg-paper text-ink-2",
                )}
              >
                Dividir distinto
              </button>

              {draft.splitType === "CUSTOM" && (
                <div className="flex flex-col gap-2 rounded-[12px] bg-paper p-2">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center gap-2 px-1">
                      <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{member.name}</span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={draft.customSplits[member.id] ?? ""}
                        onChange={(event) => setCustomAmount(member.id, event.target.value)}
                        placeholder="0"
                        className="h-8 w-24 rounded-[10px] border border-line bg-sand px-2 text-right text-[14px] text-ink outline-none"
                      />
                    </div>
                  ))}
                  <span className={cn("text-[13px]", SPLIT_TONE_CLASS[splitStatus.tone])}>{splitStatus.label}</span>
                </div>
              )}
            </div>
          )}

          {fundToggleVisible && (
            <div className="flex items-center justify-between rounded-[12px] bg-paper px-3 py-2">
              <span className="inline-flex items-center gap-2 text-[14px] text-ink">
                <Wallet className="size-4" />
                Pagado con el fondo
              </span>
              <Toggle checked={resolvedChargeToFund} onCheckedChange={(chargeToFund) => onChange({ ...draft, chargeToFund })} />
            </div>
          )}

          <textarea
            value={draft.notes}
            onChange={(event) => onChange({ ...draft, notes: event.target.value.slice(0, 500) })}
            placeholder="Nota"
            rows={2}
            maxLength={500}
            className="w-full rounded-[12px] border border-line bg-paper px-3 py-2 text-[14px] text-ink outline-none"
          />
        </div>
      )}
    </div>
  );
}
