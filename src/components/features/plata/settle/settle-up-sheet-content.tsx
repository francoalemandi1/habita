"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ds/sheet";
import { Button } from "@/components/ds/button";
import { Banner } from "@/components/ds/banner";
import { useSnackbar } from "@/components/ds/snackbar";
import { useBalances, useIsOnline, usePrefersReducedMotion, useSettleUp } from "@/hooks/use-money";
import { findMemberNet } from "../saldos/saldos-logic";
import { buildSettleRows, settleButtonLabel, settleConsequenceLine } from "./settle-logic";
import { SettleTransferRowView } from "./settle-transfer-row";
import { AnimatedAmount } from "./animated-amount";

import type { SettleUpSheetProps } from "../plata-view-props";
import type { SettlementTransfer } from "@habita/contracts";

export function SettleUpSheetContent({
  open,
  onOpenChange,
  currentMemberId,
  currentMemberType,
}: SettleUpSheetProps): React.JSX.Element {
  const router = useRouter();
  const { show } = useSnackbar();
  const { data: balances } = useBalances();
  const settleUp = useSettleUp(open);
  const isOnline = useIsOnline();
  const reducedMotion = usePrefersReducedMotion();
  const [confirmedNet, setConfirmedNet] = useState<number | null>(null);

  const rows = useMemo(
    () => (balances ? buildSettleRows(balances.byCurrency, currentMemberId, currentMemberType) : []),
    [balances, currentMemberId, currentMemberType],
  );
  const recordableRows = rows.filter((row) => row.recordable);
  const currentNet = balances ? findMemberNet(balances.balances, currentMemberId) : 0;
  const primaryCurrency = balances?.primaryCurrency ?? "ARS";
  const consequence = settleConsequenceLine(rows, currentMemberId);

  async function handleConfirm() {
    const transfers: SettlementTransfer[] = recordableRows.map((row) => ({
      fromMemberId: row.transaction.fromMemberId,
      toMemberId: row.transaction.toMemberId,
      amount: row.transaction.amount,
      currency: row.currency,
    }));

    const result = await settleUp.mutateAsync({ transfers });
    const nextNet = findMemberNet(result.balances.balances, currentMemberId);
    setConfirmedNet(nextNet);

    setTimeout(
      () => {
        onOpenChange(false);
        setConfirmedNet(null);
        show({
          text: "Pagos registrados",
          actionKind: "navigate",
          onAction: () => router.push("/plata?v=saldos"),
        });
      },
      reducedMotion ? 0 : 400,
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Liquidar saldos">
      <div className="flex flex-col gap-4">
        {!isOnline && <Banner tone="offline">Necesitás conexión para liquidar.</Banner>}

        {confirmedNet !== null ? (
          <div className="py-8 text-center">
            <p className="text-[32px] font-bold text-ink">
              <AnimatedAmount from={currentNet} to={confirmedNet} durationMs={reducedMotion ? 0 : 400} />
            </p>
            {confirmedNet === 0 && <p className="mt-1 text-[15px] text-ink-2">Están al día</p>}
          </div>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-[15px] text-ink-2">Están al día</p>
        ) : (
          <>
            <div className="flex flex-col">
              {rows.map((row) => (
                <SettleTransferRowView
                  key={`${row.currency}-${row.transaction.fromMemberId}-${row.transaction.toMemberId}`}
                  row={row}
                  currentMemberId={currentMemberId}
                  primaryCurrency={primaryCurrency}
                />
              ))}
            </div>

            {consequence && <p className="text-[13px] text-ink-2">{consequence}</p>}

            {settleUp.isError && (
              <p className="text-[13px] text-ladrillo-text">No se pudo registrar. Probá de nuevo.</p>
            )}

            {recordableRows.length > 0 && (
              <Button
                onClick={handleConfirm}
                disabled={!isOnline || settleUp.isPending}
                loading={settleUp.isPending}
                loadingLabel="Liquidando"
              >
                {isOnline ? settleButtonLabel(recordableRows.length) : "Necesitás conexión"}
              </Button>
            )}
          </>
        )}
      </div>
    </Sheet>
  );
}
