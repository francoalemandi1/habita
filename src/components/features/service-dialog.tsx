"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import {
  CATEGORY_OPTIONS,
  CATEGORY_ICONS,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  inferCategory,
} from "@/lib/expense-constants";
import { getSuggestedServices, searchServices, SCAN_SECTION_LABELS, SECTION_ORDER } from "@/lib/service-catalog";
import { frequencyLabel } from "@/lib/service-utils";
import { Loader2, ArrowLeft, Pencil, Search, Mail, Check, X } from "lucide-react";
import { iconSize } from "@/lib/design-tokens";
import { apiFetch } from "@/lib/api-client";

import type { ExpenseCategory, SplitType, RecurringFrequency } from "@prisma/client";
import type { MemberOption, SerializedService } from "@/types/expense";
import type { ServicePreset, ServiceSection } from "@/lib/service-catalog";
import type { DetectedService } from "@/lib/gmail/scanner";

const FREQUENCY_OPTIONS: Array<{ value: RecurringFrequency; label: string }> = [
  { value: "WEEKLY", label: "Semanal" },
  { value: "MONTHLY", label: "Mensual" },
  { value: "BIMONTHLY", label: "Bimestral" },
  { value: "QUARTERLY", label: "Trimestral" },
  { value: "YEARLY", label: "Anual" },
];

const SHORT_FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  WEEKLY: "Sem.",
  MONTHLY: "Mens.",
  BIMONTHLY: "Bim.",
  QUARTERLY: "Trim.",
  YEARLY: "Anual",
};

type DialogView = "picker" | "form" | "gmailScan";

interface ExistingServiceRef {
  id: string;
  title: string;
}

interface GmailScanResult {
  detected: DetectedService[];
  alreadyExists: ExistingServiceRef[];
}

interface ServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: MemberOption[];
  currentMemberId: string;
  onSaved: () => void;
  existing?: SerializedService;
  householdCity?: string | null;
}

export function ServiceDialog({
  open,
  onOpenChange,
  members,
  currentMemberId,
  onSaved,
  existing,
  householdCity,
}: ServiceDialogProps) {
  const toast = useToast();
  const isEditing = !!existing;
  const [isSaving, setIsSaving] = useState(false);

  // View state
  const [view, setView] = useState<DialogView>(isEditing ? "form" : "picker");
  const [previousView, setPreviousView] = useState<DialogView>("picker");
  const [searchQuery, setSearchQuery] = useState("");

  // Gmail scan state
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<GmailScanResult | null>(null);
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [deletingServiceIds, setDeletingServiceIds] = useState<Set<string>>(new Set());

  // Form state
  const [title, setTitle] = useState(existing?.title ?? "");
  const [provider, setProvider] = useState(existing?.provider ?? "");
  const [accountNumber, setAccountNumber] = useState(existing?.accountNumber ?? "");
  const [amount, setAmount] = useState(existing?.lastAmount?.toString() ?? "");
  const [category, setCategory] = useState<ExpenseCategory>(existing?.category ?? "UTILITIES");
  const [frequency, setFrequency] = useState<RecurringFrequency>(
    (existing?.frequency as RecurringFrequency) ?? "MONTHLY",
  );
  const [dayOfMonth, setDayOfMonth] = useState(existing?.dayOfMonth?.toString() ?? "1");
  const [paidById, setPaidById] = useState(existing?.paidById ?? currentMemberId);
  const [autoGenerate, setAutoGenerate] = useState(existing?.autoGenerate ?? false);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [showCategorySelect, setShowCategorySelect] = useState(false);
  const [categoryManuallySet, setCategoryManuallySet] = useState(false);

  // Memoize suggested services
  const suggestedGroups = useMemo(
    () => getSuggestedServices(householdCity ?? null),
    [householdCity],
  );

  const searchResults = useMemo(
    () => searchQuery.length >= 2 ? searchServices(searchQuery, householdCity ?? null) : [],
    [searchQuery, householdCity],
  );

  // Group detected services by catalog section for display
  const groupedDetected = useMemo(() => {
    if (!scanResult?.detected.length) return [];

    const bySection = new Map<ServiceSection, DetectedService[]>();
    for (const service of scanResult.detected) {
      const existing = bySection.get(service.section) ?? [];
      existing.push(service);
      bySection.set(service.section, existing);
    }

    return SECTION_ORDER
      .filter((s) => bySection.has(s))
      .map((s) => ({
        section: s,
        label: SCAN_SECTION_LABELS[s],
        services: bySection.get(s)!,
      }));
  }, [scanResult?.detected]);

  const isSearching = searchQuery.length >= 2;

  function resetForm() {
    setTitle("");
    setProvider("");
    setAccountNumber("");
    setAmount("");
    setCategory("UTILITIES");
    setFrequency("MONTHLY");
    setDayOfMonth("1");
    setPaidById(currentMemberId);
    setAutoGenerate(false);
    setNotes("");
    setShowCategorySelect(false);
    setView(isEditing ? "form" : "picker");
    setCategoryManuallySet(false);
    setSearchQuery("");
    setScanResult(null);
    setSelectedServices(new Set());
    setDeletingServiceIds(new Set());
  }

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen) resetForm();
  }

  function handlePresetSelect(preset: ServicePreset) {
    setTitle(preset.title);
    setProvider(preset.provider ?? "");
    setCategory(preset.category);
    setFrequency(preset.frequency);
    setCategoryManuallySet(false);
    setPreviousView("picker");
    setView("form");
  }

  function handleCustomEntry() {
    setPreviousView("picker");
    setView("form");
  }

  function handleBackToPresets() {
    resetForm();
  }

  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setTitle(newTitle);
      if (!categoryManuallySet) {
        const inferred = inferCategory(newTitle);
        if (inferred) {
          setCategory(inferred);
        }
      }
    },
    [categoryManuallySet],
  );

  function handleCategorySelect(newCategory: ExpenseCategory) {
    setCategory(newCategory);
    setCategoryManuallySet(true);
    setShowCategorySelect(false);
  }

  // ─── Gmail scan handlers ──────────────────────────────────────────

  async function handleGmailScan() {
    setIsScanning(true);
    setView("gmailScan");

    try {
      const result = await apiFetch<GmailScanResult>("/api/services/scan-gmail", {
        method: "POST",
      });
      setScanResult(result);
      setSelectedServices(new Set(result.detected.map((d) => d.title)));
    } catch (error) {
      if (error instanceof Error && error.message.includes("Gmail no conectado")) {
        window.location.href = "/api/gmail/authorize";
        return;
      }
      toast.error("Error", "No se pudo escanear Gmail");
      setView("picker");
    } finally {
      setIsScanning(false);
    }
  }

  function toggleServiceSelection(serviceTitle: string) {
    setSelectedServices((prev) => {
      const next = new Set(prev);
      if (next.has(serviceTitle)) {
        next.delete(serviceTitle);
      } else {
        next.add(serviceTitle);
      }
      return next;
    });
  }

  /** Open form pre-filled with a detected service's scraped data */
  function handleDetectedServiceEdit(service: DetectedService) {
    setTitle(service.title);
    setProvider(service.provider);
    setCategory(service.category);
    setFrequency(service.frequency);
    if (service.lastAmount != null) {
      setAmount(service.lastAmount.toString());
    }
    if (service.dueDate) {
      // Extract day of month from due date (YYYY-MM-DD)
      const day = parseInt(service.dueDate.split("-")[2] ?? "1", 10);
      if (day >= 1 && day <= 28) {
        setDayOfMonth(day.toString());
      }
    }
    if (service.clientNumber) {
      setAccountNumber(service.clientNumber);
    }
    setCategoryManuallySet(false);
    setPreviousView("gmailScan");
    setView("form");
  }

  async function handleImportSelected() {
    if (!scanResult || selectedServices.size === 0) return;

    const toImport = scanResult.detected.filter((d) => selectedServices.has(d.title));
    setIsImporting(true);

    try {
      const result = await apiFetch<{ imported: number }>("/api/services/import", {
        method: "POST",
        body: {
          services: toImport.map((d) => ({
            title: d.title,
            provider: d.provider,
            accountNumber: d.clientNumber,
            category: d.category,
            currency: d.currency,
            frequency: d.frequency,
            lastAmount: d.lastAmount,
          })),
        },
      });

      toast.success(`${result.imported} servicio${result.imported !== 1 ? "s" : ""} importado${result.imported !== 1 ? "s" : ""}`);
      onSaved();
      handleOpenChange(false);
    } catch {
      toast.error("Error", "No se pudieron importar los servicios");
    } finally {
      setIsImporting(false);
    }
  }

  async function handleDeleteExistingService(service: ExistingServiceRef) {
    setDeletingServiceIds((prev) => new Set(prev).add(service.id));
    try {
      await apiFetch(`/api/services/${service.id}`, { method: "DELETE" });
      setScanResult((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          alreadyExists: prev.alreadyExists.filter((s) => s.id !== service.id),
        };
      });
      toast.success(`${service.title} eliminado`);
      onSaved();
    } catch {
      toast.error("Error", "No se pudo eliminar el servicio");
    } finally {
      setDeletingServiceIds((prev) => {
        const next = new Set(prev);
        next.delete(service.id);
        return next;
      });
    }
  }

  // ─── Form submit ──────────────────────────────────────────────────

  async function handleSubmit() {
    if (!title.trim()) {
      toast.error("Error", "Completa el nombre del servicio");
      return;
    }

    const parsedAmount = amount ? parseFloat(amount) : null;
    if (parsedAmount !== null && (isNaN(parsedAmount) || parsedAmount <= 0)) {
      toast.error("Error", "El monto debe ser un numero positivo");
      return;
    }

    setIsSaving(true);

    const now = new Date();
    const nextDue = new Date(now);
    const parsedDay = parseInt(dayOfMonth, 10);

    if (frequency === "WEEKLY") {
      nextDue.setDate(nextDue.getDate() + 7);
    } else {
      nextDue.setMonth(nextDue.getMonth() + 1);
      if (!isNaN(parsedDay) && parsedDay >= 1 && parsedDay <= 28) {
        nextDue.setDate(parsedDay);
      }
    }

    try {
      if (existing) {
        await apiFetch(`/api/services/${existing.id}`, {
          method: "PATCH",
          body: {
            title: title.trim(),
            provider: provider.trim() || null,
            accountNumber: accountNumber.trim() || null,
            lastAmount: parsedAmount,
            category,
            frequency,
            dayOfMonth: frequency !== "WEEKLY" ? (parsedDay || 1) : null,
            paidById,
            autoGenerate,
            notes: notes.trim() || null,
          },
        });
        toast.success("Servicio actualizado");
      } else {
        await apiFetch("/api/services", {
          method: "POST",
          body: {
            title: title.trim(),
            provider: provider.trim() || null,
            accountNumber: accountNumber.trim() || null,
            lastAmount: parsedAmount,
            category,
            frequency,
            dayOfMonth: frequency !== "WEEKLY" ? (parsedDay || 1) : null,
            paidById,
            autoGenerate,
            notes: notes.trim() || null,
            splitType: "EQUAL" as SplitType,
            nextDueDate: nextDue.toISOString(),
          },
        });
        toast.success("Servicio creado");
      }

      onSaved();
      handleOpenChange(false);
    } catch {
      toast.error("Error", "No se pudo guardar el servicio");
    } finally {
      setIsSaving(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {view === "gmailScan"
              ? "Servicios encontrados"
              : isEditing ? "Editar servicio" : "Nuevo servicio"}
          </DialogTitle>
        </DialogHeader>

        {view === "picker" && (
          /* ── Picker: Gmail scan + search + suggestions ── */
          <div className="space-y-3 py-2">
            {/* Gmail scan button */}
            <button
              type="button"
              onClick={handleGmailScan}
              className="flex w-full items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-left transition-colors hover:bg-primary/10"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Buscar en tu Gmail</p>
                <p className="text-xs text-muted-foreground">
                  Detectamos tus facturas y suscripciones
                </p>
              </div>
            </button>

            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar servicio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {isSearching ? (
              searchResults.length > 0 ? (
                <div className="space-y-1">
                  {searchResults.map((preset) => (
                    <PresetChip key={preset.title} preset={preset} onClick={handlePresetSelect} />
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No se encontr&oacute; &ldquo;{searchQuery}&rdquo;
                </p>
              )
            ) : (
              <div className="space-y-3">
                {suggestedGroups.map((group) => (
                  <div key={group.label}>
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {group.label}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {group.presets.map((preset) => (
                        <PresetChip key={preset.title} preset={preset} onClick={handlePresetSelect} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Custom entry */}
            <button
              type="button"
              onClick={handleCustomEntry}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-muted-foreground/25 py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
            >
              <Pencil className="h-3.5 w-3.5" />
              Agregar servicio custom
            </button>
          </div>
        )}

        {view === "gmailScan" && (
          /* ── Gmail scan results ── */
          <div className="space-y-3 py-2">
            <button
              type="button"
              onClick={() => { setView("picker"); setScanResult(null); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" />
              Volver
            </button>

            {isScanning ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <div className="text-center">
                  <p className="text-sm font-medium">Escaneando tu Gmail...</p>
                  <p className="text-xs text-muted-foreground">
                    Buscamos facturas y suscripciones recientes
                  </p>
                </div>
              </div>
            ) : scanResult ? (
              <>
                {groupedDetected.length > 0 ? (
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                      Toca un servicio para revisarlo y editarlo antes de guardarlo
                    </p>
                    {groupedDetected.map((group) => (
                      <div key={group.section}>
                        <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          {group.label}
                        </p>
                        <div className="space-y-1.5">
                          {group.services.map((service) => {
                            const Icon = CATEGORY_ICONS[service.category];
                            const colorClasses = CATEGORY_COLORS[service.category];
                            return (
                              <button
                                key={service.title}
                                type="button"
                                onClick={() => handleDetectedServiceEdit(service)}
                                className="flex w-full items-center gap-3 rounded-lg border border-input p-3 text-left transition-colors hover:border-primary/30 hover:bg-primary/5"
                              >
                                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${colorClasses}`}>
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="truncate text-sm font-medium">{service.title}</p>
                                    {service.lastAmount != null && (
                                      <span className="shrink-0 text-sm font-semibold">
                                        {service.currency === "USD" ? "US$" : "$"}{service.lastAmount.toLocaleString("es-AR")}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                    <span>{SHORT_FREQUENCY_LABELS[service.frequency]}</span>
                                    {service.dueDate && (
                                      <>
                                        <span>&middot;</span>
                                        <span>Vence {new Date(service.dueDate + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })}</span>
                                      </>
                                    )}
                                    {service.clientNumber && (
                                      <>
                                        <span>&middot;</span>
                                        <span>Cta: {service.clientNumber}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <Pencil className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No se encontraron servicios nuevos en tu Gmail
                  </p>
                )}

                {scanResult.alreadyExists.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Ya agregados
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Toca la X para eliminar y volver a escanear
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {scanResult.alreadyExists.map((service) => (
                        <span
                          key={service.id}
                          className="inline-flex items-center gap-1 rounded-full border border-input px-2.5 py-1 text-xs text-muted-foreground"
                        >
                          <Check className="h-3 w-3" />
                          {service.title}
                          <button
                            type="button"
                            onClick={() => handleDeleteExistingService(service)}
                            disabled={deletingServiceIds.has(service.id)}
                            className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                            title={`Eliminar ${service.title}`}
                          >
                            {deletingServiceIds.has(service.id) ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <X className="h-3 w-3" />
                            )}
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {scanResult.detected.length > 1 && (
                  <Button
                    variant="outline"
                    onClick={handleImportSelected}
                    disabled={selectedServices.size === 0 || isImporting}
                    className="w-full"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className={`mr-2 ${iconSize.md} animate-spin`} />
                        Importando...
                      </>
                    ) : (
                      `Importar todos (${scanResult.detected.length})`
                    )}
                  </Button>
                )}
              </>
            ) : null}
          </div>
        )}

        {view === "form" && (
          /* ── Form ── */
          <>
            {!isEditing && (
              <button
                type="button"
                onClick={() => {
                  if (previousView === "gmailScan" && scanResult) {
                    setView("gmailScan");
                  } else {
                    handleBackToPresets();
                  }
                }}
                className="mb-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3 w-3" />
                {previousView === "gmailScan" ? "Volver a resultados" : "Volver a sugerencias"}
              </button>
            )}

            <div className="space-y-4 py-2">
              <Input
                placeholder="Nombre (ej: Edenor, Netflix, Alquiler)"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                maxLength={100}
                autoFocus
              />

              <Input
                placeholder="Proveedor (opcional)"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                maxLength={100}
              />

              <Input
                placeholder="Nro de cliente (opcional)"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                maxLength={100}
              />

              <div className="space-y-1.5">
                <Label>Ultimo monto (opcional)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-medium text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="0"
                    step="0.01"
                    className="pl-8 text-lg font-medium"
                  />
                </div>
              </div>

              {/* Category chip */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowCategorySelect(!showCategorySelect)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    category !== "OTHER"
                      ? "border-primary/30 bg-primary/5 text-foreground"
                      : "border-input hover:bg-muted"
                  }`}
                >
                  {(() => { const Icon = CATEGORY_ICONS[category]; return <Icon className="h-3.5 w-3.5" />; })()}
                  <span>{CATEGORY_LABELS[category]}</span>
                </button>
              </div>

              {showCategorySelect && (
                <div className="grid grid-cols-2 gap-1.5 rounded-lg border p-2">
                  {CATEGORY_OPTIONS.map((opt) => {
                    const Icon = CATEGORY_ICONS[opt.value];
                    const isSelected = opt.value === category;
                    const colorClasses = CATEGORY_COLORS[opt.value];
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleCategorySelect(opt.value)}
                        className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                          isSelected ? "bg-primary/10 font-medium text-primary" : "hover:bg-muted"
                        }`}
                      >
                        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${colorClasses}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Frequency */}
              <div className="space-y-1.5">
                <Label>Frecuencia</Label>
                <div className="flex flex-wrap gap-1.5">
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFrequency(opt.value)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                        frequency === opt.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-input hover:bg-muted"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Day of month */}
              {frequency !== "WEEKLY" && (
                <div className="space-y-1.5">
                  <Label htmlFor="day-of-month">Dia del mes (1-28)</Label>
                  <Input
                    id="day-of-month"
                    type="number"
                    inputMode="numeric"
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(e.target.value)}
                    min="1"
                    max="28"
                    className="w-20"
                  />
                </div>
              )}

              {/* Payer */}
              {members.length > 1 && (
                <div className="space-y-1.5">
                  <Label>Quien paga?</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {members.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaidById(m.id)}
                        className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                          paidById === m.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-input hover:bg-muted"
                        }`}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Auto-generate toggle */}
              <label className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoGenerate}
                  onChange={(e) => setAutoGenerate(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <div>
                  <p className="text-sm font-medium">Registrar automaticamente</p>
                  <p className="text-xs text-muted-foreground">
                    Genera el gasto cada {frequencyLabel(frequency).toLowerCase()} sin intervencion
                  </p>
                </div>
              </label>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="service-notes">Notas (opcional)</Label>
                <textarea
                  id="service-notes"
                  placeholder="Detalle adicional..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={500}
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSaving}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className={`mr-2 ${iconSize.md} animate-spin`} />
                    Guardando...
                  </>
                ) : (
                  "Guardar"
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── PresetChip ─────────────────────────────────────────────────────

function PresetChip({
  preset,
  onClick,
}: {
  preset: ServicePreset;
  onClick: (preset: ServicePreset) => void;
}) {
  const Icon = CATEGORY_ICONS[preset.category];
  return (
    <button
      type="button"
      onClick={() => onClick(preset)}
      className="inline-flex items-center gap-1.5 rounded-full border border-input px-3 py-1.5 text-sm transition-colors hover:border-primary/30 hover:bg-primary/5"
    >
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      {preset.title}
    </button>
  );
}
