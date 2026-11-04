"use client";

import { useState } from "react";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ds/button";
import { Banner } from "@/components/ds/banner";
import { EmptyState } from "@/components/ds/empty-state";
import { Skeleton } from "@/components/ds/skeleton";
import { useBalances } from "@/hooks/use-money";
import { SettleUpSheet } from "../settle-up-sheet";
import { BalanceHero } from "./balance-hero";
import { TransactionsList } from "./transactions-list";
import { SettlementHistory } from "./settlement-history";
import { isSettledUp } from "./saldos-logic";

import type { PlataViewProps } from "../plata-view-props";

export function SaldosContent({ currentMemberId, currentMemberType, members }: PlataViewProps): React.JSX.Element {
  const { data: balances, isLoading, isError } = useBalances();
  const [sheetOpen, setSheetOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-14 w-48" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (isError || !balances) {
    return <Banner tone="attention">No pudimos cargar los saldos. Probá de nuevo.</Banner>;
  }

  const settledUp = isSettledUp(balances.balances);

  if (settledUp && balances.transactions.length === 0) {
    return <EmptyState icon={Wallet} title="Están al día" description="Nadie le debe nada a nadie en la casa." />;
  }

  return (
    <div className="flex flex-col gap-6">
      <BalanceHero balances={balances} currentMemberId={currentMemberId} />

      <TransactionsList balances={balances} currentMemberId={currentMemberId} />

      {!settledUp && (
        <Button onClick={() => setSheetOpen(true)}>Liquidar todo</Button>
      )}

      <SettlementHistory currentMemberId={currentMemberId} />

      <SettleUpSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        currentMemberId={currentMemberId}
        currentMemberType={currentMemberType}
        members={members}
      />
    </div>
  );
}
