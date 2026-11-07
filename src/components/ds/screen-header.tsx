"use client";

import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TabHeaderProps {
  variant: "tab";
  title: string;
  /** True once the page has scrolled — crossfades to the small title. */
  scrolled?: boolean;
  action?: React.ReactNode;
}

export interface DetailHeaderProps {
  variant: "detail";
  title: string;
  backLabel: string;
  onBack: () => void;
  action?: React.ReactNode;
}

export interface SheetHeaderProps {
  variant: "sheet-header";
  title: string;
  cancelLabel?: string;
  onCancel: () => void;
  action?: React.ReactNode;
}

export type ScreenHeaderProps = TabHeaderProps | DetailHeaderProps | SheetHeaderProps;

/** §6.24 — three variants: tab (big title shrinks on scroll), detail (back + centered title), sheet-header. */
export function ScreenHeader(props: ScreenHeaderProps): React.JSX.Element {
  if (props.variant === "tab") {
    return (
      <div className="flex items-center justify-between px-5 py-3">
        <h1
          className={cn(
            "font-bold text-ink transition-all duration-260",
            props.scrolled ? "text-[17px] font-semibold" : "text-[30px]"
          )}
        >
          {props.title}
        </h1>
        {props.action}
      </div>
    );
  }

  if (props.variant === "detail") {
    return (
      <div className="flex items-center justify-between px-5 py-3">
        <button type="button" onClick={props.onBack} className="flex items-center gap-1 text-monte">
          <ChevronLeft className="size-5" strokeWidth={1.75} />
          <span className="text-[16px] font-medium">{props.backLabel}</span>
        </button>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-[16px] font-semibold text-ink">{props.title}</h1>
        {props.action}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-5 py-4">
      <button type="button" onClick={props.onCancel} className="text-[15px] font-medium text-monte">
        {props.cancelLabel ?? "Cancelar"}
      </button>
      <h1 className="text-[16px] font-semibold text-ink">{props.title}</h1>
      {props.action}
    </div>
  );
}
