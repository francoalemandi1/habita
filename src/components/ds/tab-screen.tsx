import { cn } from "@/lib/utils";

export interface TabScreenProps {
  title: string;
  /** Same-weight complement in Tinta 3 ("La casa, *esta semana*", §9.3). */
  titleComplement?: string;
  /** L1 label above the title (date, week). */
  eyebrow?: string;
  /** Segmented control: full width under the title on mobile, beside it on desktop. */
  segments?: React.ReactNode;
  /** Icon buttons / secondary actions next to the title. */
  actions?: React.ReactNode;
  /** Desktop-only element on the header's right side (e.g. the Casa composer). */
  aside?: React.ReactNode;
  /** Row above the header (e.g. the Casa mobile header with bell and avatar). */
  topBar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Level-0 screen frame shared by the four places (§5.1, §6.24): same paddings, max width
 * and header rhythm on every tab, so switching places never shifts the layout.
 */
export function TabScreen({
  title,
  titleComplement,
  eyebrow,
  segments,
  actions,
  aside,
  topBar,
  children,
  className,
}: TabScreenProps): React.JSX.Element {
  return (
    <div className={cn("mx-auto flex w-full max-w-[1120px] flex-col gap-5 px-5 pb-10 pt-6 md:gap-6 md:px-8 md:pt-8", className)}>
      {topBar}
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex items-end justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            {eyebrow && (
              <span className="text-[11px] font-semibold uppercase tracking-[.08em] text-ink-2">{eyebrow}</span>
            )}
            <h1 className="text-[30px] font-bold leading-[1.05] tracking-[-.035em] text-ink md:text-[32px]">
              {title}
              {titleComplement && <span className="text-ink-3"> {titleComplement}</span>}
            </h1>
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2 md:hidden">{actions}</div>}
        </div>
        {aside && <div className="hidden md:block">{aside}</div>}
        {(segments || actions) && (
          <div className="flex items-center gap-2">
            {segments && <div className="flex-1 md:flex-none">{segments}</div>}
            {actions && <div className="hidden items-center gap-2 md:flex">{actions}</div>}
          </div>
        )}
      </header>
      {children}
    </div>
  );
}
