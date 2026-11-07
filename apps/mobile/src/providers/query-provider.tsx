import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import Constants from "expo-constants";
import { useEffect, useState } from "react";
import { queryKeys } from "@habita/contracts";

import { setupOfflineDetector } from "@/lib/offline-detector";
import { registerOfflineMutationDefaults } from "@/lib/offline-mutation-registry";

import type { ReactNode } from "react";
import type { Query } from "@tanstack/react-query";

/** Casa summary, week/my assignments, tasks, expenses + balances, shopping list — the rest refetches on reconnect. */
const PERSIST_ALLOWED_PREFIXES = new Set<string>([
  queryKeys.households.all()[0],
  queryKeys.assignments.all()[0],
  queryKeys.tasks.all()[0],
  queryKeys.expenses.all()[0],
  queryKeys.shoppingList.all()[0],
]);

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function shouldDehydrateQuery(query: Query): boolean {
  const prefix = query.queryKey[0];
  return typeof prefix === "string" && PERSIST_ALLOWED_PREFIXES.has(prefix) && query.state.status === "success";
}

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "habita_mobile_query_cache",
});

const appVersion = Constants.expoConfig?.version ?? "0";

interface MobileQueryProviderProps {
  children: ReactNode;
}

export function MobileQueryProvider({ children }: MobileQueryProviderProps) {
  const [queryClient] = useState(() => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          retry: 1,
          staleTime: 30_000,
        },
      },
    });
    // Must run before the persisted client below is restored and hydrated,
    // since a persisted paused mutation has no mutationFn of its own.
    registerOfflineMutationDefaults(client);
    return client;
  });

  useEffect(() => {
    setupOfflineDetector();
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: ONE_DAY_MS,
        buster: appVersion,
        dehydrateOptions: { shouldDehydrateQuery },
      }}
      onSuccess={() => {
        void queryClient.resumePausedMutations();
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
