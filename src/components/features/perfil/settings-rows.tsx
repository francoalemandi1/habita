"use client";

import Link from "next/link";
import { CalendarClock, Bell, Palette, HelpCircle } from "lucide-react";
import { ListRow } from "@/components/ds/list-row";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useSnackbar } from "@/components/ds/snackbar";
import { resetAllGuides } from "@/hooks/use-first-visit";
import { PERFIL_ROUTES } from "@habita/contracts";

/** §5.3 Perfil → settings rows: Disponibilidad, Avisos, Apariencia, Guías de uso. */
export function SettingsRows(): React.JSX.Element {
  const snackbar = useSnackbar();

  return (
    <div className="rounded-[16px] bg-surface px-1">
      <Link href={PERFIL_ROUTES.availability} className="block">
        <ListRow leadingIcon={CalendarClock} title="Disponibilidad" />
      </Link>
      <Link href={PERFIL_ROUTES.notificationSettings} className="block">
        <ListRow leadingIcon={Bell} title="Avisos" />
      </Link>
      <ListRow leadingIcon={Palette} title="Apariencia" trailing={<ThemeToggle />} />
      <button
        type="button"
        onClick={() => {
          resetAllGuides();
          snackbar.show({ text: "La próxima vez vas a ver las guías de nuevo" });
        }}
        className="block w-full"
      >
        <ListRow leadingIcon={HelpCircle} title="Guías de uso" />
      </button>
    </div>
  );
}
