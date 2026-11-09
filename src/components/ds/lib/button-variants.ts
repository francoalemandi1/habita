import { cva } from "class-variance-authority";

/**
 * §6.1 — `primary` is reserved for one CTA per screen and `destructive`
 * only ever renders inside a Dialog; callers are responsible for that rule.
 */
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[12px] text-[15px] font-semibold px-[18px] transition-[transform,background-color] duration-100 active:scale-[0.97] disabled:pointer-events-none disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monte focus-visible:ring-offset-2 focus-visible:ring-offset-paper [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-monte text-paper hover:bg-monte-pressed active:bg-monte-pressed",
        ink: "bg-ink text-paper hover:bg-ink/90 active:opacity-90",
        secondary: "bg-sand text-ink hover:bg-line active:opacity-90",
        link: "bg-transparent text-monte underline underline-offset-[3px] px-0 hover:text-ink",
        destructive: "bg-ladrillo text-paper active:opacity-90",
      },
      size: {
        default: "h-12",
        sm: "h-9 text-sm",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);
