"use client";

import * as React from "react";
import { notFound } from "next/navigation";
import { useTheme } from "next-themes";
import { Home, Receipt, ShoppingCart, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ds/button";
import { TextField } from "@/components/ds/text-field";
import { Checkbox } from "@/components/ds/checkbox";
import { Toggle } from "@/components/ds/toggle";
import { Stepper } from "@/components/ds/stepper";
import { RadioGroup } from "@/components/ds/radio";
import { SegmentedControl } from "@/components/ds/segmented-control";
import { FilterChip, StatusChip } from "@/components/ds/chip";
import { StoreChip } from "@/components/ds/store-chip";
import { Avatar, AvatarGroup } from "@/components/ds/avatar";
import { Badge } from "@/components/ds/badge";
import { Banner } from "@/components/ds/banner";
import { SnackbarProvider, useSnackbar } from "@/components/ds/snackbar";
import { Sheet } from "@/components/ds/sheet";
import { Dialog } from "@/components/ds/dialog";
import { ListRow } from "@/components/ds/list-row";
import { SwipeRow } from "@/components/ds/swipe-row";
import { ContextMenu } from "@/components/ds/context-menu";
import { ScreenHeader } from "@/components/ds/screen-header";
import { Skeleton } from "@/components/ds/skeleton";
import { EmptyState } from "@/components/ds/empty-state";
import { ProgressBar, SplitBar } from "@/components/ds/progress-bar";
import { Composer } from "@/components/ds/composer";
import { Coachmark } from "@/components/ds/coachmark";
import { Sidebar } from "@/components/ds/sidebar";

import type { CheckboxState } from "@/components/ds/checkbox";

const CHECKBOX_STATES: CheckboxState[] = ["pending", "pressed", "done", "toVerify", "transferred"];

function Section({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <section className="flex flex-col gap-3 border-b border-line pb-8">
      <h2 className="text-[17px] font-semibold text-ink">{title}</h2>
      <div className="flex flex-wrap items-start gap-3">{children}</div>
    </section>
  );
}

function SnackbarDemo(): React.JSX.Element {
  const { show } = useSnackbar();
  return (
    <>
      <Button
        variant="secondary"
        onClick={() => show({ text: "«Lavar platos» · hecha", actionKind: "undo", onAction: () => {} })}
      >
        Mostrar undo
      </Button>
      <Button
        variant="secondary"
        onClick={() => show({ text: "No se pudo guardar", tone: "error", actionKind: "retry", onAction: () => {} })}
      >
        Mostrar error
      </Button>
    </>
  );
}

export default function ComponentsGalleryPage(): React.JSX.Element {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const { theme, setTheme } = useTheme();
  const [checkStates, setCheckStates] = React.useState<CheckboxState[]>(["pending", "pending", "pending", "pending", "transferred"]);
  const [toggled, setToggled] = React.useState(true);
  const [stepperValue, setStepperValue] = React.useState(2);
  const [radioValue, setRadioValue] = React.useState<string | null>("a");
  const [segment, setSegment] = React.useState<"semana" | "lista" | "reparto">("semana");
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [composerText, setComposerText] = React.useState("");
  const [coachmarkVisible, setCoachmarkVisible] = React.useState(true);

  const toggleCheckbox = (index: number) => {
    setCheckStates((prev) =>
      prev.map((state, i) => (i === index ? (state === "done" ? "pending" : "done") : state))
    );
  };

  return (
    <SnackbarProvider>
      <div className="flex min-h-screen flex-col gap-8 bg-paper p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-[30px] font-bold text-ink">DS — Galería de componentes</h1>
          <Button variant="secondary" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? "Modo claro" : "Modo oscuro"}
          </Button>
        </div>

        <Section title="Button">
          <Button variant="primary">Guardar</Button>
          <Button variant="ink">Guardar gasto</Button>
          <Button variant="secondary">Cancelar</Button>
          <Button variant="link">Ver más</Button>
          <Button variant="destructive">Eliminar</Button>
          <Button variant="primary" loading loadingLabel="Liquidando">Liquidar</Button>
          <Button variant="primary" disabled>Deshabilitado</Button>
          <Button variant="primary" size="sm">Chico</Button>
        </Section>

        <Section title="TextField">
          <TextField label="Nombre" placeholder="Sofi" />
          <TextField label="Monto" error="Ingresá un monto mayor a 0" />
          <TextField label="Deshabilitado" disabled value="No editable" />
        </Section>

        <Section title="Checkbox (5 estados)">
          {CHECKBOX_STATES.map((state, index) => (
            <div key={state} className="flex flex-col items-center gap-1">
              <Checkbox
                state={checkStates[index] ?? state}
                onToggle={() => toggleCheckbox(index)}
                transferredLabel="pasada a Sofi · esperando"
              />
              <span className="text-[11px] uppercase text-ink-3">{state}</span>
            </div>
          ))}
        </Section>

        <Section title="Toggle / Stepper">
          <Toggle checked={toggled} onCheckedChange={setToggled} label="Aviso" />
          <Toggle checked={false} onCheckedChange={() => {}} disabled label="Deshabilitado" />
          <Stepper value={stepperValue} onChange={setStepperValue} min={0} max={10} />
        </Section>

        <Section title="Radio">
          <RadioGroup
            name="miembro"
            value={radioValue}
            onChange={setRadioValue}
            options={[
              { value: "a", label: "Sofi", meta: "2 tareas hoy" },
              { value: "b", label: "Tomi", meta: "1 tarea hoy" },
            ]}
          />
        </Section>

        <Section title="SegmentedControl">
          <SegmentedControl
            value={segment}
            onChange={setSegment}
            options={[
              { value: "semana", label: "Semana" },
              { value: "lista", label: "Lista" },
              { value: "reparto", label: "Reparto" },
            ]}
          />
        </Section>

        <Section title="Chip / StoreChip">
          <FilterChip active>Esta semana</FilterChip>
          <FilterChip>Mes</FilterChip>
          <StatusChip status="al-dia" />
          <StatusChip status="vence-hoy" />
          <StatusChip status="descuento" />
          <StatusChip status="esperando" />
          <StoreChip store="Coto" />
          <StoreChip store="Dia" />
        </Section>

        <Section title="Avatar / AvatarGroup">
          <Avatar name="Sofi" size={56} isSelf />
          <Avatar name="Tomi" size={40} />
          <Avatar name="Franco" size={28} seniorityRank={2} />
          <AvatarGroup members={[{ id: "1", name: "Sofi" }, { id: "2", name: "Tomi" }, { id: "3", name: "Franco" }, { id: "4", name: "Mica" }]} max={3} />
        </Section>

        <Section title="Badge / Banner">
          <Badge tone="monte">Al día</Badge>
          <Badge tone="ladrillo">Vence hoy</Badge>
          <Badge tone="manteca">Oferta</Badge>
          <Banner tone="info">Revisamos tu Gmail hoy a las 7:00.</Banner>
          <Banner tone="offer">Ahorrás $6.210 en Coto.</Banner>
          <Banner tone="attention">Le debés $16.107 a Sofi.</Banner>
          <Banner tone="offline">Necesitás conexión para esto.</Banner>
        </Section>

        <Section title="Snackbar">
          <SnackbarDemo />
        </Section>

        <Section title="Sheet / Dialog">
          <Button variant="secondary" onClick={() => setSheetOpen(true)}>Abrir sheet</Button>
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen} title="Anotar">
            <p className="text-[15px] text-ink-2">Contenido del sheet.</p>
          </Sheet>
          <Button variant="secondary" onClick={() => setDialogOpen(true)}>Abrir dialog</Button>
          <Dialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            title="Eliminar Casa Alemandi"
            body="Esto elimina la casa para todos sus miembros."
            confirmLabel="Eliminar"
            confirmNameRequired="Casa Alemandi"
            onConfirm={() => setDialogOpen(false)}
          />
        </Section>

        <Section title="ListRow / SwipeRow">
          <div className="w-full max-w-md">
            <ListRow leadingIcon={Home} title="Lavar platos" meta="Hoy · Vos" trailingAmount="" />
            <SwipeRow
              leadingIcon={Receipt}
              title="Supermercado"
              meta="Pagó Sofi · entre 3"
              trailingAmount="$12.400"
              primaryAction={{ label: "Hecha", onAction: () => {} }}
              passAction={{ label: "Pasar", onAction: () => {} }}
              deleteAction={{ label: "Borrar", onAction: () => {} }}
            />
          </div>
        </Section>

        <Section title="ContextMenu">
          <ContextMenu
            open={menuOpen}
            onOpenChange={setMenuOpen}
            trigger={<Button variant="secondary">Abrir menú</Button>}
            items={[
              { id: "edit", label: "Editar", icon: Pencil, onSelect: () => {} },
              { id: "delete", label: "Eliminar", icon: Trash2, onSelect: () => {}, destructive: true },
            ]}
          />
        </Section>

        <Section title="ScreenHeader">
          <div className="w-full max-w-md border border-line">
            <ScreenHeader variant="tab" title="Tareas" />
          </div>
          <div className="w-full max-w-md border border-line">
            <ScreenHeader variant="detail" title="Gasto" backLabel="Plata" onBack={() => {}} />
          </div>
          <div className="w-full max-w-md border border-line">
            <ScreenHeader variant="sheet-header" title="Anotar" onCancel={() => {}} />
          </div>
        </Section>

        <Section title="Skeleton / EmptyState">
          <Skeleton className="h-10 w-40" />
          <EmptyState icon={ShoppingCart} title="Nada en la lista" description="Agregá un producto para empezar." />
        </Section>

        <Section title="ProgressBar / SplitBar">
          <ProgressBar value={12} max={18} label="12 de 18 hechas" className="w-64" />
          <SplitBar
            total={11}
            label="Vos 4 · Sofi 4 · Tomi 3"
            segments={[
              { id: "vos", value: 4, colorClassName: "bg-monte" },
              { id: "sofi", value: 4, colorClassName: "bg-manteca" },
              { id: "tomi", value: 3, colorClassName: "bg-ladrillo" },
            ]}
            className="w-64"
          />
        </Section>

        <Section title="Composer">
          <Composer
            value={composerText}
            onChange={setComposerText}
            onSubmit={() => setComposerText("")}
            chips={composerText ? [{ id: "type", label: "Gasto", isType: true }] : []}
            className="w-full max-w-md"
          />
        </Section>

        <Section title="Coachmark">
          {coachmarkVisible && <Coachmark text="Tocá + para anotar un gasto." onDismiss={() => setCoachmarkVisible(false)} />}
        </Section>

        <Section title="Sidebar">
          <div className="h-[420px] border border-line">
            <Sidebar
              active="casa"
              household={{ name: "Casa Alemandi" }}
              member={{ name: "Franco" }}
              onAnotar={() => {}}
              items={[
                { id: "casa", label: "Casa", icon: Home, href: "/casa" },
                { id: "plata", label: "Plata", icon: Receipt, href: "/plata" },
                { id: "super", label: "Súper", icon: ShoppingCart, href: "/super" },
              ]}
            />
          </div>
        </Section>
      </div>
    </SnackbarProvider>
  );
}
