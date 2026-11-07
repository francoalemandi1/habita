"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ds/button";
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
    <div className="flex items-center justify-between gap-4 rounded-[16px] bg-surface px-4 py-3.5">
      {isSettled ? (
        <span className="text-[15px] text-ink-2">Están al día</span>
      ) : (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {owedToMe && (
            <span className="text-[15px] text-ink">
              {owedToMe.memberName} te debe{" "}
              <span className="font-medium tabular-nums text-monte">{formatArs(owedToMe.amount)}</span>
            </span>
          )}
          {iOwe && (
            <span className="text-[15px] text-ink">
              Le debés a {iOwe.memberName}{" "}
              <span className="font-medium tabular-nums text-ladrillo-text">{formatArs(iOwe.amount)}</span>
            </span>
          )}
        </div>
      )}

      {!isSettled && (
        <Button variant="secondary" size="sm" onClick={() => setSettleOpen(true)}>
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
