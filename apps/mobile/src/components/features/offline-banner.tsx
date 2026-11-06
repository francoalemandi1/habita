import { useMutationState } from "@tanstack/react-query";
import { Banner } from "@/components/ds";
import { useIsOnline } from "@/hooks/use-is-online";

/** §6.18 / §7 Sin conexión — one banner, mounted once, closes by itself when the cause clears. */
export function OfflineBanner(): React.JSX.Element | null {
  const isOnline = useIsOnline();
  const pendingCount = useMutationState({
    filters: { status: "pending" },
    select: (mutation) => mutation.state.isPaused,
  }).filter(Boolean).length;

  if (isOnline) return null;

  const text =
    pendingCount > 0
      ? `Sin conexión · Los cambios se envían cuando vuelva · ${pendingCount} pendientes`
      : "Sin conexión · Los cambios se envían cuando vuelva";

  return <Banner tone="offline" text={text} />;
}
