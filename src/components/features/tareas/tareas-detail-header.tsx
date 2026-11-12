"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { APP_ROUTES } from "@habita/contracts";

interface TareasDetailHeaderProps {
  title: string;
  backLabel?: string;
  backHref?: string;
}

/** Back link on its own row, then the page title — server route pages can't hand a client component an inline `onBack`. */
export function TareasDetailHeader({ title, backLabel = "Tareas", backHref = APP_ROUTES.tareas }: TareasDetailHeaderProps): React.JSX.Element {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-1 px-5 py-3">
      <button
        type="button"
        onClick={() => router.push(backHref)}
        className="flex w-fit items-center gap-1 rounded-[8px] py-1 text-monte outline-none focus-visible:ring-2 focus-visible:ring-monte"
      >
        <ChevronLeft className="size-5" strokeWidth={1.75} aria-hidden="true" />
        <span className="text-[16px] font-medium">{backLabel}</span>
      </button>
      <h1 className="text-[34px] font-bold tracking-tight text-ink">{title}</h1>
    </div>
  );
}
