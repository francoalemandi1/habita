"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { APP_ROUTES } from "@habita/contracts";
import { expenseInsightsQueryOptions } from "@/hooks/use-expense-insights";
import { balancesQueryOptions } from "@/hooks/use-money";
import { shoppingListQueryOptions } from "@/hooks/use-shopping-list";

import type { QueryClient } from "@tanstack/react-query";
import type { ComponentProps } from "react";

// Client queries that gate a tab's first paint. Starting them on hover/focus/touch hides the
// round trip that would otherwise run after the route mounts and show a second skeleton.
const TAB_DATA_PREFETCHERS: Partial<Record<string, (queryClient: QueryClient) => void>> = {
  [APP_ROUTES.plata]: (queryClient) => {
    void queryClient.prefetchQuery(expenseInsightsQueryOptions());
    void queryClient.prefetchQuery(balancesQueryOptions());
  },
  [APP_ROUTES.super]: (queryClient) => {
    void queryClient.prefetchQuery(shoppingListQueryOptions());
  },
};

type IntentLinkProps = ComponentProps<typeof Link> & { href: string };

/** Next Link that also warms the destination tab's client data on intent. */
export function IntentLink({ href, onMouseEnter, onFocus, onTouchStart, ...props }: IntentLinkProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const prefetchTabData = (): void => TAB_DATA_PREFETCHERS[href]?.(queryClient);

  return (
    <Link
      href={href}
      onMouseEnter={(event) => {
        prefetchTabData();
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        prefetchTabData();
        onFocus?.(event);
      }}
      onTouchStart={(event) => {
        prefetchTabData();
        onTouchStart?.(event);
      }}
      {...props}
    />
  );
}
