"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "whatsapp-opt-in-dismissed";

export function WhatsAppOptInBanner() {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(true);
  const [isLinked, setIsLinked] = useState<boolean | null>(null);

  useEffect(() => {
    const wasDismissed = localStorage.getItem(STORAGE_KEY);
    setDismissed(wasDismissed === "true");

    fetch("/api/whatsapp/link")
      .then((res) => res.json())
      .then((data: { isLinked?: boolean }) => {
        setIsLinked(data.isLinked === true);
      })
      .catch(() => setIsLinked(false));
  }, []);

  if (dismissed || isLinked === null || isLinked) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  return (
    <Card className="border-green-600/20 bg-green-50">
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-green-100">
            <MessageCircle className="h-4 w-4 text-green-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium">Conectá WhatsApp</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Completá tareas y recibí recordatorios directo desde WhatsApp
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => router.push("/profile")}
              >
                Vincular
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
