"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ds/sheet";
import { Button } from "@/components/ds/button";
import { TextField } from "@/components/ds/text-field";
import { Banner } from "@/components/ds/banner";
import { useSnackbar } from "@/components/ds/snackbar";
import { useIsOnline } from "@/hooks/use-money";
import { formatCurrencyArs } from "../saldos/saldos-logic";
import { isValidContributionAmount, suggestedContributionAmount } from "./fondo-logic";

import type { CreateContributionPayload, MemberContributionStatus } from "@habita/contracts";

interface FondoContributeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentMemberStatus: MemberContributionStatus | undefined;
  onContribute: (payload: CreateContributionPayload) => Promise<void>;
}

/** §7 pattern C "Aportar al fondo" — amount prefilled with the pending quota, editable. */
export function FondoContributeSheet({
  open,
  onOpenChange,
  currentMemberStatus,
  onContribute,
}: FondoContributeSheetProps): React.JSX.Element {
  const router = useRouter();
  const { show } = useSnackbar();
  const isOnline = useIsOnline();
  const [amount, setAmount] = useState(() => String(suggestedContributionAmount(currentMemberStatus)));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount(String(suggestedContributionAmount(currentMemberStatus)));
      setError(null);
    }
  }, [open, currentMemberStatus]);

  const parsedAmount = Number(amount);
  const isValid = isValidContributionAmount(parsedAmount);

  async function handleSubmit() {
    if (!isValid) {
      setError("Ingresá un monto mayor a $0.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onContribute({ amount: parsedAmount });
      onOpenChange(false);
      show({
        text: "Aporte registrado",
        actionKind: "navigate",
        onAction: () => router.push("/plata?v=fondo"),
      });
    } catch {
      setError("No se pudo registrar. Probá de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Aportar al fondo">
      <div className="flex flex-col gap-4">
        {!isOnline && <Banner tone="offline">Necesitás conexión para aportar.</Banner>}

        <TextField
          label="Monto"
          type="number"
          min={1}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />

        <p className="text-[13px] text-ink-2">Queda registrado en el fondo de la casa</p>

        {error && <p className="text-[13px] text-ladrillo-text">{error}</p>}

        <Button
          onClick={handleSubmit}
          disabled={!isOnline || isSubmitting}
          loading={isSubmitting}
          loadingLabel="Aportando"
        >
          {isOnline ? `Aportar ${formatCurrencyArs(isValid ? parsedAmount : 0)}` : "Necesitás conexión"}
        </Button>
      </div>
    </Sheet>
  );
}
