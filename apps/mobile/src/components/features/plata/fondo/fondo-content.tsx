import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Wallet } from "lucide-react-native";
import { Banner, Button, EmptyState, Skeleton } from "@/components/ds";
import { spacing } from "@/theme";
import { useContributeToFund, useFund, useSetupFund } from "@/hooks/use-fund";
import { FondoHero } from "./fondo-hero";
import { FondoQuotasList } from "./fondo-quotas-list";
import { FondoExpensesList } from "./fondo-expenses-list";
import { FondoContributeSheet } from "./fondo-contribute-sheet";
import { FondoSetupSheet } from "./fondo-setup-sheet";

import type { PlataViewProps } from "../plata-view-props";

export function FondoContent({ currentMemberId, currentMemberType, members }: PlataViewProps): React.JSX.Element {
  const { data: fund, isLoading, isError, refetch } = useFund();
  const contribute = useContributeToFund();
  const setup = useSetupFund();
  const [showSetup, setShowSetup] = useState(false);
  const [showContribute, setShowContribute] = useState(false);

  if (isLoading) {
    return (
      <View style={styles.gap}>
        <Skeleton height={160} />
        <Skeleton height={96} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.errorBlock}>
        <Banner tone="attention" text="No pudimos cargar el fondo." />
        <Button label="Reintentar" variant="link" onPress={() => void refetch()} />
      </View>
    );
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
          actionLabel={isAdult ? "Armar el fondo" : undefined}
          onAction={isAdult ? () => setShowSetup(true) : undefined}
        />
        {isAdult && (
          <FondoSetupSheet
            visible={showSetup}
            onClose={() => setShowSetup(false)}
            members={members}
            onSetup={(payload) => setup.mutateAsync(payload)}
          />
        )}
      </>
    );
  }

  const currentMemberStatus = fund.memberStatuses.find((status) => status.memberId === currentMemberId);

  return (
    <View style={styles.gap}>
      <FondoHero fund={fund} currentMemberStatus={currentMemberStatus} onContribute={() => setShowContribute(true)} />

      <FondoQuotasList memberStatuses={fund.memberStatuses} />

      <FondoExpensesList expenses={fund.recentExpenses} />

      <FondoContributeSheet
        visible={showContribute}
        onClose={() => setShowContribute(false)}
        currentMemberStatus={currentMemberStatus}
        onContribute={(payload) => contribute.mutateAsync(payload)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  gap: {
    gap: spacing.xl,
  },
  errorBlock: {
    gap: spacing.xs,
  },
});
