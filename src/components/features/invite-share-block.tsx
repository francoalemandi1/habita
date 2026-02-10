"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getInviteUrl } from "@/lib/invite-code";

interface InviteShareBlockProps {
  inviteCode: string;
  householdName: string;
}

export function InviteShareBlock({ inviteCode, householdName }: InviteShareBlockProps) {
  const [copied, setCopied] = useState(false);
  const inviteUrl = getInviteUrl(inviteCode);
  const shareMessage = `Unite a mi hogar "${householdName}" en Habita: ${inviteUrl}`;

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Unite a ${householdName} en Habita`,
          text: `Te invito a unirte a mi hogar "${householdName}" en Habita`,
          url: inviteUrl,
        });
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }

    await copyToClipboard(shareMessage);
  };

  const handleCopyLink = async () => {
    await copyToClipboard(inviteUrl);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available
    }
  };

  return (
    <div className="min-w-0 space-y-3">
      {/* Invite link */}
      <div className="min-w-0">
        <p className="mb-1.5 text-sm text-muted-foreground">Link de invitación</p>
        <div className="flex min-w-0 items-center gap-2">
          <div className="min-w-0 flex-1 truncate rounded-lg bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
            {inviteUrl}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 shrink-0 p-0"
            onClick={handleCopyLink}
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Share button */}
      <Button
        variant="outline"
        className="w-full gap-2 border-primary text-primary hover:bg-primary/5 hover:text-primary"
        onClick={handleShare}
      >
        <Share2 className="h-4 w-4" />
        Invitar a mi hogar
      </Button>

      {/* Fallback code */}
      <p className="text-center text-xs text-muted-foreground">
        o compartí el código: <span className="font-mono font-semibold tracking-widest">{inviteCode}</span>
      </p>
    </div>
  );
}
