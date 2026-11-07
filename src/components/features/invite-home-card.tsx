"use client";

import { useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { InviteShareBlock } from "@/components/features/invite-share-block";
import { useSnackbar } from "@/components/ds/snackbar";
import { UserPlus, X } from "lucide-react";
import { iconSize } from "@/lib/design-tokens";

const STORAGE_KEY = "invite-card-dismissed";

function subscribeToStorage(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function readStoredDismissal(): boolean {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

// Hidden during SSR so the card never flashes before localStorage is read
function readServerDismissal(): boolean {
  return true;
}

interface InviteHomeCardProps {
  inviteCode: string;
  householdName: string;
  variant?: "default" | "subtle";
}

export function InviteHomeCard({ inviteCode, householdName, variant = "default" }: InviteHomeCardProps) {
  const snackbar = useSnackbar();
  const isStoredDismissed = useSyncExternalStore(subscribeToStorage, readStoredDismissal, readServerDismissal);
  const [isDismissedNow, setIsDismissedNow] = useState(false);

  if (isStoredDismissed || isDismissedNow) return null;

  const handleDismiss = () => {
    setIsDismissedNow(true);
    localStorage.setItem(STORAGE_KEY, "true");
    snackbar.show({ text: "Ocultamos la invitación · podés compartir el código desde tu perfil" });
  };

  const isSubtle = variant === "subtle";

  return (
    <div
      className={cn(
        "relative rounded-2xl px-4 pt-4 pb-4 shadow-sm sm:px-6 sm:pt-6 sm:pb-6",
        isSubtle ? "bg-sand" : "bg-monte-soft",
      )}
    >
      <button
        onClick={handleDismiss}
        className="absolute right-3 top-3 rounded-full p-1 text-ink-2 hover:bg-sand"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="mb-3 flex items-center gap-2 pr-6">
        <UserPlus className={`${iconSize.lg} shrink-0 ${isSubtle ? "text-ink-2" : "text-monte"}`} />
        <p className="font-medium text-ink">
          {isSubtle ? "¿Compartís tu hogar?" : "Invitá a los miembros de tu hogar"}
        </p>
      </div>
      {isSubtle && (
        <p className="mb-3 text-sm text-ink-2">
          Invitá a alguien a unirse y organicen las tareas juntos
        </p>
      )}
      <InviteShareBlock inviteCode={inviteCode} householdName={householdName} />
    </div>
  );
}
