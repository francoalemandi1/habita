"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Plus, Receipt } from "lucide-react";
import { Button } from "@/components/ds/button";
import { EmptyState } from "@/components/ds/empty-state";
import { Skeleton } from "@/components/ds/skeleton";
import { InlineError } from "@/components/features/inline-error";
import { useServices } from "@/hooks/use-services";
import { ServiceFormSheet } from "@/components/features/plata/servicios/service-form-sheet";
import { ServiceList } from "@/components/features/plata/servicios/service-list";
import { ServiceDetailPanel } from "@/components/features/plata/servicios/service-detail-panel";
import { GmailCard } from "@/components/features/plata/servicios/gmail-card";
import { DetectedInvoiceCard } from "@/components/features/plata/servicios/detected-invoice-card";
import { isDismissedDetectedService } from "@/components/features/plata/servicios/detected-dismiss-store";
import { detectedServiceKey } from "@/components/features/plata/servicios/servicios-logic";

import type { GmailScanResult } from "@/hooks/use-services";
import type { SerializedService, MemberOption } from "@/types/expense";

interface ServicesPageProps {
  allMembers: MemberOption[];
  currentMemberId: string;
}

/** §5.3 "Plata" — Servicios: Gmail status, detected invoices, list + 440 detail panel on web. */
export function ServicesPage({ allMembers, currentMemberId }: ServicesPageProps): React.JSX.Element {
  const { data: services, isLoading, isError, refetch } = useServices();
  const [scanResult, setScanResult] = useState<GmailScanResult | null>(null);
  const [dismissedTick, setDismissedTick] = useState(0);
  const [selected, setSelected] = useState<SerializedService | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<SerializedService | undefined>();

  const detectedVisible = useMemo(() => {
    void dismissedTick;
    return (scanResult?.detected ?? []).filter((d) => !isDismissedDetectedService(detectedServiceKey(d)));
  }, [scanResult, dismissedTick]);

  function handleDismiss(): void {
    setDismissedTick((n) => n + 1);
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-[16px]" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <InlineError message="No pudimos cargar los servicios." onRetry={() => refetch()} />;
  }

  const activeServices = (services ?? []).filter((s) => s.isActive);
  const inactiveServices = (services ?? []).filter((s) => !s.isActive);
  const hasServices = activeServices.length > 0 || inactiveServices.length > 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <Link href="/plata" className="flex items-center gap-1 text-monte">
          <ChevronLeft className="size-5" strokeWidth={1.75} />
          <span className="text-[16px] font-medium">Plata</span>
        </Link>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="size-4" strokeWidth={1.75} />
          Nuevo
        </Button>
      </div>
      <h1 className="text-[22px] font-bold text-ink">Servicios</h1>

      <GmailCard onScanned={setScanResult} />

      {detectedVisible.map((service) => (
        <DetectedInvoiceCard key={detectedServiceKey(service)} service={service} onDismiss={handleDismiss} />
      ))}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className={selected ? "hidden lg:block lg:flex-1" : "flex-1"}>
          {!hasServices ? (
            <EmptyState
              icon={Receipt}
              title="Sin servicios"
              description="Agregá servicios recurrentes como luz, gas o internet para llevar un control de vencimientos."
              action={<Button onClick={() => setShowCreate(true)}>Agregar servicio</Button>}
            />
          ) : (
            <ServiceList
              services={[...activeServices, ...inactiveServices]}
              selectedId={selected?.id ?? null}
              onSelect={setSelected}
            />
          )}
        </div>

        {selected && (
          <div className="flex flex-col gap-3 lg:shrink-0">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="flex items-center gap-1 text-[14px] font-medium text-monte lg:hidden"
            >
              <ChevronLeft className="size-4" strokeWidth={1.75} />
              Servicios
            </button>
            <ServiceDetailPanel
              service={selected}
              onEdit={() => setEditing(selected)}
              onDeleted={() => setSelected(null)}
            />
          </div>
        )}
      </div>

      <ServiceFormSheet
        open={showCreate}
        onOpenChange={setShowCreate}
        currentMemberId={currentMemberId}
        members={allMembers}
        onSaved={() => undefined}
      />

      {editing && (
        <ServiceFormSheet
          open={!!editing}
          onOpenChange={(open) => { if (!open) setEditing(undefined); }}
          currentMemberId={currentMemberId}
          members={allMembers}
          existing={editing}
          onSaved={(service) => setSelected(service)}
        />
      )}
    </div>
  );
}
