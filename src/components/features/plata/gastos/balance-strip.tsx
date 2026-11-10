"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ds/button";
import { cn } from "@/lib/utils";
import { SettleUpSheet } from "@/components/features/plata/settle-up-sheet";

import type { PlataMember } from "@/components/features/plata/plata-view-props";
import type { MemberType } from "@prisma/client";

interface BalanceTile {
  memberName: string;
  amount: number;
}

interface BalanceStripProps {
  owedToMe: BalanceTile | null;
  iOwe: BalanceTile | null;
  isSettled: boolean;
  currentMemberId: string;
  currentMemberType: MemberType;
  members: PlataMember[];
}

function formatArs(amount: number): string {
  return `$${Math.round(amount).toLocaleString("es-AR")}`;
}

/** Balance strip + Liquidar entry (handoff §5.3 "Plata" — Gastos). */
export function BalanceStrip({
  owedToMe,
  iOwe,
  isSettled,
  currentMemberId,
  currentMemberType,
  members,
}: BalanceStripProps): React.JSX.Element {
  const router = useRouter();
  const [settleOpen, setSettleOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-stretch gap-2.5">
      {isSettled && (
        <span className="inline-flex items-center rounded-full bg-monte-soft px-3 py-1.5 text-[14px] font-medium text-monte">
          Están al día
        </span>
      )}
      {owedToMe && <Tile label={`${owedToMe.memberName} te debe`} amount={owedToMe.amount} tone="positive" />}
      {iOwe && <Tile label={`Le debés a ${iOwe.memberName}`} amount={iOwe.amount} tone="negative" />}
      {!isSettled && (
        <Button onClick={() => setSettleOpen(true)} className="h-auto min-h-12 self-stretch">
          Liquidar
        </Button>
      )}

      <SettleUpSheet
        open={settleOpen}
        onOpenChange={(open) => {
          setSettleOpen(open);
          if (!open) router.refresh();
        }}
        currentMemberId={currentMemberId}
        currentMemberType={currentMemberType}
        members={members}
      />
    </div>
  );
}

function Tile({ label, amount, tone }: { label: string; amount: number; tone: "positive" | "negative" }) {
  return (
    <div className="flex min-w-[150px] flex-1 flex-col gap-0.5 rounded-[14px] bg-surface px-4 py-3 md:flex-none">
      <span className="truncate text-[12px] text-ink-2">{label}</span>
      <span className={cn("text-[20px] font-semibold tracking-[-.02em]", tone === "positive" ? "text-monte" : "text-ladrillo-text")}>
        {formatArs(amount)}
      </span>
    </div>
  );
}
