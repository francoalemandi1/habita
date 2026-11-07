"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { CalendarClock, Bell, Palette, HelpCircle } from "lucide-react";
import { ListRow } from "@/components/ds/list-row";
import { SegmentedControl } from "@/components/ds/segmented-control";
import { useSnackbar } from "@/components/ds/snackbar";
import { resetAllGuides } from "@/hooks/use-first-visit";
import { PERFIL_ROUTES } from "@habita/contracts";

type ThemeOption = "light" | "dark" | "system";

const THEME_OPTIONS: Array<{ value: ThemeOption; label: string }> = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
  { value: "system", label: "Auto" },
];

/** §5.3 Perfil → settings rows: Disponibilidad, Avisos, Apariencia, Guías de uso. */
export function SettingsRows(): React.JSX.Element {
  const snackbar = useSnackbar();
  const { theme, setTheme } = useTheme();

  return (
    <div className="rounded-[16px] bg-surface px-1">
      <Link href={PERFIL_ROUTES.availability} className="block">
        <ListRow leadingIcon={CalendarClock} title="Disponibilidad" />
      </Link>
      <Link href={PERFIL_ROUTES.notificationSettings} className="block">
        <ListRow leadingIcon={Bell} title="Avisos" />
      </Link>
      <ListRow
        leadingIcon={Palette}
        title="Apariencia"
        trailing={
          <SegmentedControl
            options={THEME_OPTIONS}
            value={theme === "light" || theme === "dark" ? theme : "system"}
            onChange={setTheme}
          />
        }
      />
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
