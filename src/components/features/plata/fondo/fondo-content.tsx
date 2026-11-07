"use client";

import { useState } from "react";
import { Wallet } from "lucide-react";
import { EmptyState } from "@/components/ds/empty-state";
import { Button } from "@/components/ds/button";
import { Skeleton } from "@/components/ds/skeleton";
import { InlineError } from "@/components/features/inline-error";
import { useContributeToFund, useFund, useSetupFund } from "@/hooks/use-fund";
import { FundSetupDialog } from "@/components/features/fund-setup-dialog";
import { FondoHero } from "./fondo-hero";
import { FondoQuotasList } from "./fondo-quotas-list";
import { FondoExpensesList } from "./fondo-expenses-list";
import { FondoContributeSheet } from "./fondo-contribute-sheet";

import type { PlataViewProps } from "../plata-view-props";

export function FondoContent({ currentMemberId, currentMemberType, members }: PlataViewProps): React.JSX.Element {
  const { data: fund, isLoading, isError, refetch } = useFund();
  const contribute = useContributeToFund();
  const setup = useSetupFund();
  const [showSetup, setShowSetup] = useState(false);
  const [showContribute, setShowContribute] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-40 w-full rounded-[20px]" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (isError) {
    return <InlineError message="No pudimos cargar el fondo." onRetry={() => refetch()} />;
  }

  if (!fund) {
    const isAdult = currentMemberType === "ADULT";
    return (
      <>
        <EmptyState
          icon={Wallet}
          title="Armá el fondo de la casa"
          description={
            isAdult
              ? "Cada miembro aporta su cuota mensual y los gastos del hogar se pagan del fondo."
              : "Un adulto de la casa puede armarlo."
          }
          action={
            isAdult ? (
              <Button onClick={() => setShowSetup(true)}>Armar el fondo</Button>
            ) : undefined
          }
        />
        {isAdult && (
          <FundSetupDialog
            open={showSetup}
            onOpenChange={setShowSetup}
            allMembers={members}
            currentMemberId={currentMemberId}
            onSaved={async (payload) => {
              await setup.mutateAsync(payload);
              setShowSetup(false);
            }}
          />
        )}
      </>
    );
  }

  const currentMemberStatus = fund.memberStatuses.find((status) => status.memberId === currentMemberId);

  return (
    <div className="flex flex-col gap-6">
      <FondoHero fund={fund} currentMemberStatus={currentMemberStatus} onContribute={() => setShowContribute(true)} />

      <FondoQuotasList memberStatuses={fund.memberStatuses} />

      <FondoExpensesList expenses={fund.recentExpenses} />

      <FondoContributeSheet
        open={showContribute}
        onOpenChange={setShowContribute}
        currentMemberStatus={currentMemberStatus}
        onContribute={async (payload) => { await contribute.mutateAsync(payload); }}
      />
    </div>
  );
}
