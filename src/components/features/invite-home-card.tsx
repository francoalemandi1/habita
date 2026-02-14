"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { InviteShareBlock } from "@/components/features/invite-share-block";
import { useToast } from "@/components/ui/toast";
import { UserPlus, X } from "lucide-react";
import { iconSize } from "@/lib/design-tokens";

const STORAGE_KEY = "invite-card-dismissed";

interface InviteHomeCardProps {
  inviteCode: string;
  householdName: string;
}

export function InviteHomeCard({ inviteCode, householdName }: InviteHomeCardProps) {
  const toast = useToast();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const wasDismissed = localStorage.getItem(STORAGE_KEY);
    setDismissed(wasDismissed === "true");
  }, []);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(STORAGE_KEY, "true");
    toast.success("Card ocultada", "Podés compartir el código de invitación desde tu perfil");
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="relative pt-4 pb-4 sm:pt-6 sm:pb-6">
        <button
          onClick={handleDismiss}
          className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="mb-3 flex items-center gap-2 pr-6">
          <UserPlus className={`${iconSize.lg} shrink-0 text-primary`} />
          <p className="font-medium">¡Invitá a los miembros de tu hogar!</p>
        </div>
        <InviteShareBlock inviteCode={inviteCode} householdName={householdName} />
      </CardContent>
    </Card>
  );
}
