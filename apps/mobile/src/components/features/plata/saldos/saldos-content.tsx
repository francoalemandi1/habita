import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Wallet } from "lucide-react-native";
import { Banner, Button, EmptyState, Skeleton } from "@/components/ds";
import { spacing } from "@/theme";
import { useBalances } from "@/hooks/use-money";
import { SettleUpSheet } from "../settle-up-sheet";
import { BalanceHero } from "./balance-hero";
import { TransactionsList } from "./transactions-list";
import { SettlementHistory } from "./settlement-history";
import { isSettledUp } from "@/lib/plata-money-saldos";

import type { PlataViewProps } from "../plata-view-props";

export function SaldosContent({ currentMemberId, currentMemberType, members }: PlataViewProps): React.JSX.Element {
  const { data: balances, isLoading, isError, refetch } = useBalances();
  const [sheetVisible, setSheetVisible] = useState(false);

  if (isLoading) {
    return (
      <View style={styles.gap}>
        <Skeleton height={56} width="60%" />
        <Skeleton height={96} />
      </View>
    );
  }

  if (isError || !balances) {
    return (
      <View style={styles.gap}>
        <Banner tone="attention" text="No pudimos cargar los saldos." />
        <Button label="Reintentar" variant="link" onPress={() => void refetch()} />
      </View>
    );
  }

  const settledUp = isSettledUp(balances.balances);

  if (settledUp && balances.transactions.length === 0) {
    return (
      <EmptyState icon={Wallet} title="Están al día" description="Nadie le debe nada a nadie en la casa." />
    );
  }

  return (
    <View style={styles.gap}>
      <BalanceHero balances={balances} currentMemberId={currentMemberId} />

      <TransactionsList balances={balances} currentMemberId={currentMemberId} />

      {!settledUp && <Button label="Liquidar todo" onPress={() => setSheetVisible(true)} />}

      <SettlementHistory currentMemberId={currentMemberId} />

      <SettleUpSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        currentMemberId={currentMemberId}
        currentMemberType={currentMemberType}
        members={members}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  gap: {
    gap: spacing.xl,
  },
});
