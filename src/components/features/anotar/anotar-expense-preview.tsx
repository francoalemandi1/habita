"use client";

import { useState } from "react";
import { expenseCategorySchema } from "@habita/contracts";
import { RadioGroup } from "@/components/ds/radio";
import { CATEGORY_LABELS } from "@/lib/expense-constants";
import { describeExpenseConsequence, formatExpenseConsequence } from "@habita/domain";
import { formatArs } from "./anotar-draft-types";
import { cn } from "@/lib/utils";

import type { MemberSummary } from "@habita/contracts";
import type { ExpenseDraft } from "./anotar-draft-types";

type OpenField = "category" | "payer" | "split" | "date" | null;

interface AnotarExpensePreviewProps {
  draft: ExpenseDraft;
  onChange: (next: ExpenseDraft) => void;
  members: MemberSummary[];
  currentMemberId: string;
}

function toggleParticipant(participantIds: string[], memberId: string): string[] {
  return participantIds.includes(memberId)
    ? participantIds.filter((id) => id !== memberId)
    : [...participantIds, memberId];
}

export function AnotarExpensePreview({ draft, onChange, members, currentMemberId }: AnotarExpensePreviewProps): React.JSX.Element {
  const [openField, setOpenField] = useState<OpenField>(null);

  const nameByMemberId = new Map(members.map((member) => [member.id, member.name] as const));
  const consequence = describeExpenseConsequence({
    amount: draft.amount,
    payerMemberId: draft.payerId,
    participantMemberIds: draft.participantIds,
    currentMemberId,
    nameByMemberId,
  });
  const consequenceText = formatExpenseConsequence(consequence, formatArs);

  const payerName = draft.payerId === currentMemberId ? "Vos pagaste" : (nameByMemberId.get(draft.payerId) ?? "¿Quién pagó?");
  const splitLabel = draft.participantIds.length === members.length ? "Entre todos" : `Entre ${draft.participantIds.length}`;

  function toggleField(field: Exclude<OpenField, null>): void {
    setOpenField((current) => (current === field ? null : field));
  }

  return (
    <div className="flex flex-col gap-3 rounded-[16px] bg-sand p-4">
      <span className="inline-flex h-[24px] w-fit items-center rounded-full bg-monte-soft px-2.5 text-[12px] font-semibold text-monte">
        Gasto
      </span>

      <input
        value={draft.title}
        onChange={(event) => onChange({ ...draft, title: event.target.value })}
        placeholder="¿Qué fue?"
        className="h-9 w-full bg-transparent text-[17px] font-semibold text-ink outline-none"
      />

      <div className="flex items-center gap-1">
        <span className="text-[13px] text-ink-2">$</span>
        <input
          type="number"
          min={0}
          step="0.01"
          value={draft.amount || ""}
          onChange={(event) => onChange({ ...draft, amount: Number(event.target.value) || 0 })}
          placeholder="0"
          className="h-8 w-28 bg-transparent text-[22px] font-bold tabular-nums text-ink outline-none"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <ChipButton label={CATEGORY_LABELS[draft.category]} active={openField === "category"} onClick={() => toggleField("category")} />
        <ChipButton label={payerName} active={openField === "payer"} onClick={() => toggleField("payer")} />
        <ChipButton label={splitLabel} active={openField === "split"} onClick={() => toggleField("split")} />
        <ChipButton label={draft.date} active={openField === "date"} onClick={() => toggleField("date")} />
      </div>

      {openField === "category" && (
        <RadioGroup
          name="anotar-expense-category"
          value={draft.category}
          onChange={(value) => {
            onChange({ ...draft, category: expenseCategorySchema.parse(value) });
            setOpenField(null);
          }}
          options={expenseCategorySchema.options.map((category) => ({ value: category, label: CATEGORY_LABELS[category] }))}
          className="rounded-[12px] bg-paper p-2"
        />
      )}

      {openField === "payer" && (
        <RadioGroup
          name="anotar-expense-payer"
          value={draft.payerId}
          onChange={(value) => {
            onChange({ ...draft, payerId: value });
            setOpenField(null);
          }}
          options={members.map((member) => ({ value: member.id, label: member.id === currentMemberId ? "Vos" : member.name }))}
          className="rounded-[12px] bg-paper p-2"
        />
      )}

      {openField === "split" && (
        <div className="flex flex-col gap-1 rounded-[12px] bg-paper p-2">
          {members.map((member) => {
            const checked = draft.participantIds.includes(member.id);
            return (
              <label key={member.id} className="flex min-h-9 cursor-pointer items-center gap-2 px-1">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onChange({ ...draft, participantIds: toggleParticipant(draft.participantIds, member.id) })}
                />
                <span className="text-[14px] text-ink">{member.id === currentMemberId ? "Vos" : member.name}</span>
              </label>
            );
          })}
        </div>
      )}

      {openField === "date" && (
        <input
          type="date"
          value={draft.date}
          onChange={(event) => {
            onChange({ ...draft, date: event.target.value });
            setOpenField(null);
          }}
          className="h-9 rounded-[12px] border border-line bg-paper px-3 text-[14px] text-ink"
        />
      )}

      {consequenceText && <p className="text-[13px] text-ink-2">{consequenceText}</p>}
    </div>
  );
}

function ChipButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn("inline-flex h-[30px] items-center rounded-full px-3 text-[13px] font-medium", active ? "bg-ink text-paper" : "bg-paper text-ink-2")}
    >
      {label}
    </button>
  );
}
