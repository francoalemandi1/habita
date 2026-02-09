"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useToast } from "@/components/ui/toast";
import { Bell, X } from "lucide-react";

const STORAGE_KEY = "push-opt-in-dismissed";

export function PushOptInBanner() {
  const push = usePushNotifications();
  const toast = useToast();
  const [dismissed, setDismissed] = useState(true); // default hidden until we check

  useEffect(() => {
    const wasDismissed = localStorage.getItem(STORAGE_KEY);
    setDismissed(wasDismissed === "true");
  }, []);

  // Don't show if not supported, already subscribed, already dismissed, or still loading
  if (!push.isSupported || push.isSubscribed || dismissed || push.isLoading) {
    return null;
  }

  // Don't show if permission was previously denied (user needs to fix in browser settings)
  if (push.permission === "denied") {
    return null;
  }

  const handleEnable = async () => {
    const ok = await push.subscribe();
    if (ok) {
      toast.success("Notificaciones activadas", "Recibirás recordatorios de tus tareas");
    } else if (push.permission === "denied") {
      toast.error("Permiso denegado", "Habilitá las notificaciones desde la configuración de tu navegador");
      handleDismiss();
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Bell className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium">Activá notificaciones</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Recibí recordatorios para no olvidarte de tus tareas del día
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Button size="sm" onClick={handleEnable} disabled={push.isLoading}>
                Activar
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDismiss}>
                Ahora no
              </Button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
