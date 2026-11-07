"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ds";
import { getInviteUrl } from "@/lib/invite-code";

interface InviteShareBlockProps {
  inviteCode: string;
  householdName: string;
}

export function InviteShareBlock({ inviteCode, householdName }: InviteShareBlockProps) {
  const [copied, setCopied] = useState(false);
  const inviteUrl = getInviteUrl(inviteCode);
  const shareMessage = `Unite a mi hogar "${householdName}" en Habita: ${inviteUrl}`;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.warn("InviteShareBlock: clipboard write failed", error);
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Unite a ${householdName} en Habita`,
          text: `Te invito a unirte a mi hogar "${householdName}" en Habita`,
          url: inviteUrl,
        });
        return;
      } catch (error) {
        console.warn("InviteShareBlock: navigator.share failed, falling back to clipboard", error);
      }
    }
    await copyToClipboard(shareMessage);
  };

  return (
    <div className="min-w-0 space-y-3">
      <div className="min-w-0">
        <p className="mb-1.5 text-[13px] text-ink-2">Link de invitación</p>
        <div className="flex min-w-0 items-center gap-2">
          <div className="min-w-0 flex-1 truncate rounded-[12px] bg-sand px-3 py-2 font-mono text-xs text-ink-2">
            {inviteUrl}
          </div>
          <button
            type="button"
            onClick={() => void copyToClipboard(inviteUrl)}
            aria-label="Copiar link"
            className="flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-sand"
          >
            {copied ? <Check className="size-4 text-monte" /> : <Copy className="size-4 text-ink" />}
          </button>
        </div>
      </div>

      <Button variant="secondary" className="w-full gap-2" onClick={() => void handleShare()}>
        <Share2 className="size-4" />
        Invitar a mi hogar
      </Button>

      <p className="text-center text-[13px] text-ink-2">
        o compartí el código: <span className="font-mono font-semibold tracking-widest text-ink">{inviteCode}</span>
      </p>
    </div>
  );
}
