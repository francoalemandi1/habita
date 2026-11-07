"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { tipTone } from "./como-venimos-logic";

import type { SpendingTip } from "@/lib/expense-insights";

/** Tips as cards — Ladrillo soft to act, Hoja/monte soft when positive (§5.3). No emojis (§10). */
export function TipCards({ tips }: { tips: SpendingTip[] }): React.JSX.Element | null {
  if (tips.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {tips.map((tip) => {
        const tone = tipTone(tip.severity);
        return (
          <div
            key={tip.id}
            className={cn(
              "rounded-[16px] p-3.5 text-[14px]",
              tone === "act" ? "bg-ladrillo-soft text-ladrillo-text" : "bg-monte-soft text-monte"
            )}
          >
            <p>{tip.message}</p>
            {tip.action && (
              <Link href={tip.action.href} className="mt-1 inline-block text-[13px] font-semibold underline underline-offset-[3px]">
                {tip.action.label}
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
