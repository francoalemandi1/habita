import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@habita/contracts";

import type { ReactNode } from "react";

export function NotificationProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const receivedListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    // Handle notification taps (app was in background or killed)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as
          | Record<string, string>
          | undefined;
        if (data?.url) {
          router.push(data.url as never);
        }
        void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
      },
    );

    // Handle notifications received while app is in foreground
    receivedListener.current = Notifications.addNotificationReceivedListener(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    });

    return () => {
      responseListener.current?.remove();
      receivedListener.current?.remove();
    };
  }, [queryClient]);

  return <>{children}</>;
}
