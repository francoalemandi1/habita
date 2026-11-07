import { ClipboardList, Receipt, ShoppingCart } from "lucide-react";

import type { LucideIcon } from "lucide-react";

interface Bullet {
  icon: LucideIcon;
  label: string;
}

const BULLETS: Bullet[] = [
  { icon: ClipboardList, label: "Repartí las tareas del hogar" },
  { icon: Receipt, label: "Llevá las cuentas claras" },
  { icon: ShoppingCart, label: "Ahorrá en el súper" },
];

/** Three bullets with a Manteca icon, per handoff §5.3 Bienvenida. */
export function BienvenidaBullets() {
  return (
    <ul className="flex w-full flex-col gap-3">
      {BULLETS.map(({ icon: Icon, label }) => (
        <li key={label} className="flex items-center gap-3 text-left">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-manteca-soft">
            <Icon className="size-[18px] text-manteca-text" strokeWidth={1.75} />
          </span>
          <span className="text-[15px] font-medium text-paper">{label}</span>
        </li>
      ))}
    </ul>
  );
}
