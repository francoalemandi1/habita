"use client";

import { useState } from "react";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ds/button";
import { EmptyState } from "@/components/ds/empty-state";
import { SectionCard } from "@/components/ds/section-card";
import { Skeleton } from "@/components/ds/skeleton";
import { useBalances } from "@/hooks/use-money";
import { InlineError } from "../../inline-error";
import { SettleUpSheet } from "../settle-up-sheet";
import { BalanceHero } from "./balance-hero";
import { TransactionsList } from "./transactions-list";
import { SettlementHistory } from "./settlement-history";
import { isSettledUp } from "./saldos-logic";

import type { PlataViewProps } from "../plata-view-props";

export function SaldosContent({ currentMemberId, currentMemberType, members }: PlataViewProps): React.JSX.Element {
  const { data: balances, isLoading, isError, refetch } = useBalances();
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
    return <InlineError message="No pudimos cargar los saldos." onRetry={() => refetch()} />;
  }

  const settledUp = isSettledUp(balances.balances);

  if (settledUp && balances.transactions.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="Están al día"
        description="Nadie le debe nada a nadie en la casa."
        className="rounded-[20px] bg-surface"
      />
    );
  }

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <BalanceHero balances={balances} currentMemberId={currentMemberId} />

      {!settledUp && (
        <SectionCard title="Entre ustedes" className="gap-3">
          <TransactionsList balances={balances} currentMemberId={currentMemberId} />
          <Button onClick={() => setSheetOpen(true)}>Liquidar todo</Button>
        </SectionCard>
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
