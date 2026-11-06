"use client";

import { ListRow } from "@/components/ds/list-row";
import { Toggle } from "@/components/ds/toggle";
import { Skeleton } from "@/components/ds/skeleton";
import { useSnackbar } from "@/components/ds/snackbar";
import { useNotificationPreferences } from "@/hooks/use-notification-preferences";

/** §5.3 Perfil → Avisos — per-category toggles, instant (pattern A). */
export function NotificationPreferencesList(): React.JSX.Element {
  const { data, isLoading, setPreference } = useNotificationPreferences();
  const snackbar = useSnackbar();

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-[60px] w-full" />
        <Skeleton className="h-[60px] w-full" />
        <Skeleton className="h-[60px] w-full" />
      </div>
    );
  }

  const preferences = data?.preferences ?? [];

  return (
    <div className="rounded-[16px] bg-surface px-1">
      {preferences.map((preference) => (
        <ListRow
          key={preference.category}
          title={preference.label}
          trailing={
            <Toggle
              checked={preference.enabled}
              onCheckedChange={(enabled) => {
                setPreference.mutate(
                  { category: preference.category, enabled },
                  {
                    onError: () => {
                      snackbar.show({ text: "No se pudo guardar · Reintentar", tone: "error" });
                    },
                  },
                );
              }}
              label={preference.label}
            />
          }
        />
      ))}
    </div>
  );
}
