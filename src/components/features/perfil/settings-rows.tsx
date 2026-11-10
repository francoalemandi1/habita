"use client";

import { useTheme } from "next-themes";
import { CalendarClock, Bell, Palette, HelpCircle } from "lucide-react";
import { ListRow } from "@/components/ds/list-row";
import { SegmentedControl } from "@/components/ds/segmented-control";
import { useSnackbar } from "@/components/ds/snackbar";
import { resetAllGuides } from "@/hooks/use-first-visit";
import { useIsClient } from "@/hooks/use-is-client";
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
  const isClient = useIsClient();
  const selectedTheme: ThemeOption = isClient && (theme === "light" || theme === "dark") ? theme : "system";

  return (
    <div className="rounded-[20px] bg-surface px-2">
      <ListRow leadingIcon={CalendarClock} title="Disponibilidad" meta="Cuándo podés y qué tareas preferís" href={PERFIL_ROUTES.availability} />
      <ListRow leadingIcon={Bell} title="Avisos" meta="Qué avisos recibir y en qué horario" href={PERFIL_ROUTES.notificationSettings} />
      {/* Hand-built row: the theme control wraps under the title on narrow screens instead of squeezing it. */}
      <div className="flex min-h-[60px] flex-wrap items-center gap-x-3 gap-y-2 border-b border-line-soft px-1 py-2">
        <span className="flex min-w-[9rem] flex-1 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-paper">
            <Palette className="size-[18px] text-ink" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <span aria-hidden="true" className="text-[15px] font-medium text-ink">Apariencia</span>
        </span>
        <SegmentedControl
          options={THEME_OPTIONS}
          value={selectedTheme}
          onChange={setTheme}
          label="Apariencia"
          className="ml-auto inline-flex w-auto"
        />
      </div>
      <ListRow
        leadingIcon={HelpCircle}
        title="Guías de uso"
        meta="Volver a ver las guías de cada pantalla"
        onClick={() => {
          resetAllGuides();
          snackbar.show({ text: "La próxima vez vas a ver las guías de nuevo" });
        }}
      />
    </div>
  );
}
