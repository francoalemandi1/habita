"use client";

import { useState } from "react";
import {
  Wallet,
  Users,
  TrendingDown,
  Plus,
  Settings,
  ChevronRight,
  AlertTriangle,
  Check,
  Clock,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORY_ICONS, CATEGORY_LABELS } from "@/lib/expense-constants";
import { iconSize } from "@/lib/design-tokens";
import { EmptyState } from "@/components/ui/empty-state";
import { formatAmount } from "@/components/features/expense-shared";
import { FundSetupDialog } from "@/components/features/fund-setup-dialog";
import { FundContributeDialog } from "@/components/features/fund-contribute-dialog";

import type { ExpenseCategory } from "@prisma/client";
import type { FundState, MemberContributionStatus, SerializedFundExpense } from "@/types/fund";
import type { MemberOption } from "@/types/expense";
import type { UseFundResult } from "@/hooks/use-fund";

// ============================================
// Types
// ============================================

interface FundViewProps {
  fund: FundState | null;
  isLoading: boolean;
  allMembers: MemberOption[];
  currentMemberId: string;
  onSetup: UseFundResult["setup"];
  onContribute: UseFundResult["contribute"];
  onUpdateAllocations: UseFundResult["updateAllocations"];
}

// ============================================
// Balance Hero
// ============================================

function BalanceHero({ fund }: { fund: FundState; onContribute: () => void }) {
  const isNegative = fund.balance < 0;
  const progressPercent = fund.monthlyTarget
    ? Math.min(100, Math.round((fund.contributedThisPeriod / fund.monthlyTarget) * 100))
    : null;

  return (
    <div
      className={cn(
        "rounded-2xl px-5 py-5",
        isNegative
          ? "bg-red-50 dark:bg-red-950/40"
          : "bg-[#d2ffa0] dark:bg-[#7aa649]/20",
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Saldo disponible
      </p>

      <div className="mt-2 flex items-baseline gap-2">
        <span
          className={cn(
            "text-3xl font-bold",
            isNegative ? "text-red-700 dark:text-red-300" : "text-foreground",
          )}
        >
          {formatAmount(fund.balance)}
        </span>
      </div>

      {isNegative && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-red-700 dark:text-red-300">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>Saldo negativo — se necesitan aportes</span>
        </div>
      )}

      {fund.monthlyTarget != null && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {formatAmount(fund.contributedThisPeriod)} aportados
            </span>
            <span>Objetivo {formatAmount(fund.monthlyTarget)}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-foreground/10">
            <div
              className="h-2 rounded-full bg-foreground/40 transition-all duration-500"
              style={{ width: `${progressPercent ?? 0}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>Gastado este mes: {formatAmount(fund.spentThisPeriod)}</span>
      </div>
    </div>
  );
}

// ============================================
// Member Contribution Row
// ============================================

function MemberRow({ status }: { status: MemberContributionStatus }) {
  const isFullyPaid = status.pending === 0 && status.allocation > 0;
  const hasNoAllocation = status.allocation === 0;

  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
            isFullyPaid
              ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
              : "bg-muted text-muted-foreground",
          )}
        >
          {status.memberName[0]?.toUpperCase() ?? "?"}
        </div>
        <span className="truncate text-sm text-foreground">{status.memberName}</span>
      </div>

      <div className="shrink-0 flex items-center gap-2">
        {hasNoAllocation ? (
          <span className="text-xs text-muted-foreground">Sin cuota</span>
        ) : isFullyPaid ? (
          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <Check className="h-3.5 w-3.5" />
            Aportó {formatAmount(status.contributed)}
          </span>
        ) : (
          <div className="text-right">
            <p className="text-xs font-medium text-foreground">
              {formatAmount(status.contributed)} / {formatAmount(status.allocation)}
            </p>
            <p className="text-[10px] text-amber-600 dark:text-amber-400">
              Debe {formatAmount(status.pending)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Fund Expense Row
// ============================================

function FundExpenseRow({ expense }: { expense: SerializedFundExpense }) {
  const cat = expense.category as ExpenseCategory;
  const Icon = CATEGORY_ICONS[cat];
  const date = new Date(expense.date);
  const dayLabel = date.toLocaleDateString("es-AR", { day: "numeric", month: "short" });

  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-foreground">{expense.title}</p>
        <p className="text-[11px] text-muted-foreground">
          {CATEGORY_LABELS[cat]} · {dayLabel}
        </p>
      </div>
      <span className="shrink-0 text-sm font-medium text-foreground">
        {formatAmount(expense.amount)}
      </span>
    </div>
  );
}

// ============================================
// Empty State — no fund yet
// ============================================

function FundEmptyState({ onSetup }: { onSetup: () => void }) {
  return (
    <EmptyState
      icon={Wallet}
      title="Configurá el fondo común"
      description="Cada miembro aporta su cuota mensual y los gastos del hogar se pagan del fondo."
    >
      <button
        type="button"
        onClick={onSetup}
        className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
      >
        <Plus className="h-4 w-4" />
        Crear fondo
      </button>
    </EmptyState>
  );
}

// ============================================
// Main Component
// ============================================

export function FundView({
  fund,
  isLoading,
  allMembers,
  currentMemberId,
  onSetup,
  onContribute,
  onUpdateAllocations,
}: FundViewProps) {
  const [showSetup, setShowSetup] = useState(false);
  const [showContribute, setShowContribute] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className={`${iconSize.lg} animate-spin text-muted-foreground`} />
      </div>
    );
  }

  if (!fund) {
    return (
      <>
        <FundEmptyState onSetup={() => setShowSetup(true)} />
        <FundSetupDialog
          open={showSetup}
          onOpenChange={setShowSetup}
          allMembers={allMembers}
          currentMemberId={currentMemberId}
          onSaved={async (payload) => {
            await onSetup(payload);
            setShowSetup(false);
          }}
        />
      </>
    );
  }

  const currentMemberStatus = fund.memberStatuses.find(
    (s) => s.memberId === currentMemberId,
  );

  return (
    <>
      <div className="space-y-4">
        {/* Balance Hero */}
        <BalanceHero fund={fund} onContribute={() => setShowContribute(true)} />

        {/* Aportar button */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowContribute(true)}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary/10 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
          >
            <Plus className={iconSize.md} />
            Registrar aporte
          </button>
          <button
            type="button"
            onClick={() => setShowSetup(true)}
            className="flex items-center justify-center rounded-xl bg-muted/60 px-3 py-2.5 text-muted-foreground transition-colors hover:bg-muted"
            title="Configurar fondo"
          >
            <Settings className={iconSize.md} />
          </button>
        </div>

        {/* Cuotas del mes */}
        {fund.memberStatuses.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Cuotas del mes
              </p>
            </div>
            <div className="rounded-2xl border border-border/40 bg-muted/20 px-4 divide-y divide-border/30">
              {fund.memberStatuses.map((status) => (
                <MemberRow key={status.memberId} status={status} />
              ))}
            </div>
          </div>
        )}

        {/* Gastos del fondo */}
        {fund.recentExpenses.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Gastos del fondo
              </p>
            </div>
            <div className="rounded-2xl border border-border/40 bg-muted/20 px-4 divide-y divide-border/30">
              {fund.recentExpenses.map((expense) => (
                <FundExpenseRow key={expense.id} expense={expense} />
              ))}
            </div>

            {fund.totalSpentAllTime > fund.recentExpenses.length * 0 && (
              <button
                type="button"
                className="flex w-full items-center justify-center gap-1 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Ver historial completo
                <ChevronRight className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        {/* My pending contribution alert */}
        {currentMemberStatus && currentMemberStatus.pending > 0 && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/40">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-amber-900 dark:text-amber-200">
                Todavía debés{" "}
                <span className="font-medium">{formatAmount(currentMemberStatus.pending)}</span>{" "}
                de tu cuota de este mes
              </p>
              <button
                type="button"
                onClick={() => setShowContribute(true)}
                className="mt-1 text-xs font-medium text-amber-700 underline-offset-2 hover:underline dark:text-amber-300"
              >
                Registrar aporte
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <FundSetupDialog
        open={showSetup}
        onOpenChange={setShowSetup}
        allMembers={allMembers}
        currentMemberId={currentMemberId}
        existingFund={fund}
        onSaved={async (payload) => {
          await onSetup(payload);
          setShowSetup(false);
        }}
        onAllocationsSaved={async (payload) => {
          await onUpdateAllocations(payload);
          setShowSetup(false);
        }}
      />

      <FundContributeDialog
        open={showContribute}
        onOpenChange={setShowContribute}
        currentMemberStatus={currentMemberStatus}
        onContribute={async (payload) => {
          await onContribute(payload);
          setShowContribute(false);
        }}
      />
    </>
  );
}
