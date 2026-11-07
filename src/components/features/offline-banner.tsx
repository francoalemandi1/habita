"use client";

import { useMutationState } from "@tanstack/react-query";
import { Banner } from "@/components/ds/banner";
import { useIsOnline } from "@/hooks/use-is-online";

/** One offline Banner on top of the content; closes on its own once reconnected (handoff §6.18, §7). */
export function OfflineBanner(): React.JSX.Element | null {
  const isOnline = useIsOnline();
  const pendingCount = useMutationState({
    filters: { predicate: (mutation) => mutation.state.isPaused },
    select: () => true,
  }).length;

  if (isOnline) return null;

  const suffix = pendingCount > 0 ? ` · ${pendingCount} pendientes` : "";
  return <Banner tone="offline">Sin conexión · Los cambios se envían cuando vuelva{suffix}</Banner>;
}
