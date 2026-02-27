"use client";

import { useState, useRef, useCallback } from "react";
import { CATEGORY_ICONS, CATEGORY_COLORS } from "@/lib/expense-constants";
import { frequencyLabel } from "@/lib/service-utils";
import { Receipt, ChevronDown, ChevronUp, Trash2, Repeat, Plus, Settings, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/features/error-states";
import { EditExpenseDialog } from "@/components/features/edit-expense-dialog";
import { cn } from "@/lib/utils";

import type { SerializedExpense, SerializedService, MemberOption } from "@/types/expense";
import type { ExpenseCategory, RecurringFrequency } from "@prisma/client";
import type { UpdateExpensePayload } from "@/components/features/expenses-view";

const MAX_SERVICES_COLLAPSED = 3;

interface ExpenseListProps {
  expenses: SerializedExpense[];
  currentMemberId: string;
  allMembers: MemberOption[];
  deletingIds: Set<string>;
  newlyCreatedIds: Set<string>;
  onExpenseUpdated: (expenseId: string, payload: UpdateExpensePayload) => void;
  onExpenseDeleted: (expenseId: string) => void;
  /** All active services (sorted by nextDueDate asc) */
  activeServices?: SerializedService[];
  /** Service IDs currently being generated */
  generatingIds?: Set<string>;
  onServiceGenerate?: (serviceId: string) => void;
  onServiceEdit?: (service: SerializedService) => void;
  onManageServices?: () => void;
  onCreateService?: () => void;
  isSolo?: boolean;
}

/** An expense is settled when every split that isn't the payer's own is marked settled. */
function isExpenseSettled(expense: SerializedExpense): boolean {
  const otherSplits = expense.splits.filter((s) => s.memberId !== expense.paidBy.id);
  if (otherSplits.length === 0) return true;
  return otherSplits.every((s) => s.settled);
}

/** Group label for a date: "Hoy", "Ayer", or formatted date. */
function getDateGroupLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const expenseDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (expenseDay.getTime() === today.getTime()) return "Hoy";
  if (expenseDay.getTime() === yesterday.getTime()) return "Ayer";

  return date.toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** Group expenses by date label, preserving order. */
function groupByDate(expenses: SerializedExpense[]): Array<{ label: string; items: SerializedExpense[] }> {
  const groups: Array<{ label: string; items: SerializedExpense[] }> = [];
  let currentLabel = "";

  for (const expense of expenses) {
    const label = getDateGroupLabel(expense.date);
    if (label !== currentLabel) {
      groups.push({ label, items: [expense] });
      currentLabel = label;
    } else {
      groups[groups.length - 1]!.items.push(expense);
    }
  }

  return groups;
}

/** Get the settlement timestamp for an expense (latest settledAt among non-payer splits). */
function getSettlementDate(expense: SerializedExpense): string | null {
  const settledDates = expense.splits
    .filter((s) => s.memberId !== expense.paidBy.id && s.settledAt)
    .map((s) => s.settledAt!);

  if (settledDates.length === 0) return null;
  return settledDates.reduce((latest, d) => (d > latest ? d : latest));
}

/** Truncate an ISO date string to the minute for grouping same-batch settlements. */
function truncateToMinute(dateStr: string): string {
  return dateStr.slice(0, 16); // "2025-02-06T14:30"
}

/** Group label for a settlement date, including time for same-day distinctions. */
function getSettledGroupLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const time = date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

  if (day.getTime() === today.getTime()) return `Liquidado hoy ${time}`;
  if (day.getTime() === yesterday.getTime()) return `Liquidado ayer ${time}`;

  return `Liquidado ${date.toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })} ${time}`;
}

/** Group settled expenses by settlement timestamp (minute precision), sorted most recent first. */
function groupBySettlementDate(expenses: SerializedExpense[]): Array<{ label: string; items: SerializedExpense[] }> {
  // Sort by settlement date descending (most recent first)
  const sorted = [...expenses].sort((a, b) => {
    const dateA = getSettlementDate(a) ?? a.date;
    const dateB = getSettlementDate(b) ?? b.date;
    return dateB.localeCompare(dateA);
  });

  const groups: Array<{ label: string; items: SerializedExpense[] }> = [];
  let currentKey = "";

  for (const expense of sorted) {
    const settlementDate = getSettlementDate(expense);
    // Group by minute so same-batch settlements stay together
    const key = settlementDate ? truncateToMinute(settlementDate) : `date-${expense.date}`;
    const label = settlementDate ? getSettledGroupLabel(settlementDate) : getDateGroupLabel(expense.date);

    if (key !== currentKey) {
      groups.push({ label, items: [expense] });
      currentKey = key;
    } else {
      groups[groups.length - 1]!.items.push(expense);
    }
  }

  return groups;
}

// ============================================
// ExpenseItem — reusable row
// ============================================

interface ExpenseItemProps {
  expense: SerializedExpense;
  currentMemberId: string;
  isDeleting: boolean;
  isNew: boolean;
  forceSettledStyle: boolean;
  hideSplitInfo?: boolean;
  onClick: () => void;
}

function ExpenseItem({
  expense,
  currentMemberId,
  isDeleting,
  isNew,
  forceSettledStyle,
  hideSplitInfo,
  onClick,
}: ExpenseItemProps) {
  const CategoryIcon = CATEGORY_ICONS[expense.category];
  const categoryColorClasses = CATEGORY_COLORS[expense.category];
  const isPayer = expense.paidBy.id === currentMemberId;

  const mySplit = expense.splits.find((s) => s.memberId === currentMemberId);
  const myAmount = mySplit?.amount ?? 0;
  const allSettled = isExpenseSettled(expense);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-all duration-200 hover:bg-muted/50 active:bg-muted",
        forceSettledStyle && "opacity-60",
        isDeleting && "translate-x-4 opacity-0",
        isNew && "animate-[expense-enter_300ms_ease-out]",
      )}
    >
      {/* Category icon */}
      <div
        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${categoryColorClasses}`}
      >
        <CategoryIcon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{expense.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {isPayer ? "Vos pagaste" : `${expense.paidBy.name} pago`}
        </p>
        {!hideSplitInfo && mySplit && !isPayer && myAmount > 0 && (
          <p className={`mt-0.5 text-xs font-medium ${allSettled ? "text-muted-foreground line-through" : "text-red-600"}`}>
            Te toca ${myAmount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
          </p>
        )}
        {!hideSplitInfo && isPayer && !allSettled && expense.amount - myAmount > 0.01 && (
          <p className="mt-0.5 text-xs font-medium text-green-600">
            Te deben ${(expense.amount - myAmount).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
          </p>
        )}
      </div>

      {/* Amount */}
      <p className="shrink-0 text-sm font-semibold">
        ${expense.amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
      </p>
    </button>
  );
}

// ============================================
// SwipeableExpenseItem — touch gesture wrapper
// ============================================

const SWIPE_THRESHOLD = 80;

interface SwipeableExpenseItemProps {
  expenseId: string;
  revealedId: string | null;
  onReveal: (id: string | null) => void;
  onDelete: () => void;
  children: React.ReactNode;
}

function SwipeableExpenseItem({
  expenseId,
  revealedId,
  onReveal,
  onDelete,
  children,
}: SwipeableExpenseItemProps) {
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const currentXRef = useRef(0);
  const isDraggingRef = useRef(false);
  const isVerticalRef = useRef(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isRevealed = revealedId === expenseId;
  const offsetX = isRevealed ? -SWIPE_THRESHOLD : 0;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    currentXRef.current = 0;
    isDraggingRef.current = false;
    isVerticalRef.current = false;
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (!touch || isVerticalRef.current) return;

      const deltaX = touch.clientX - startXRef.current;
      const deltaY = touch.clientY - startYRef.current;

      // Determine direction on first significant movement
      if (!isDraggingRef.current && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
        if (Math.abs(deltaY) > Math.abs(deltaX)) {
          isVerticalRef.current = true;
          return;
        }
        isDraggingRef.current = true;
      }

      if (!isDraggingRef.current || !contentRef.current) return;

      // Only allow left swipe (negative deltaX) unless already revealed
      const baseOffset = isRevealed ? -SWIPE_THRESHOLD : 0;
      const rawOffset = baseOffset + deltaX;
      const clampedOffset = Math.min(0, Math.max(-SWIPE_THRESHOLD * 1.2, rawOffset));

      currentXRef.current = deltaX;
      contentRef.current.style.transition = "none";
      contentRef.current.style.transform = `translateX(${clampedOffset}px)`;
    },
    [isRevealed],
  );

  const handleTouchEnd = useCallback(() => {
    if (!contentRef.current || isVerticalRef.current) return;

    contentRef.current.style.transition = "transform 200ms ease-out";

    if (isDraggingRef.current) {
      const baseOffset = isRevealed ? -SWIPE_THRESHOLD : 0;
      const finalOffset = baseOffset + currentXRef.current;

      if (finalOffset < -SWIPE_THRESHOLD / 2) {
        onReveal(expenseId);
        contentRef.current.style.transform = `translateX(-${SWIPE_THRESHOLD}px)`;
      } else {
        onReveal(null);
        contentRef.current.style.transform = "translateX(0)";
        setConfirmDelete(false);
      }
    }

    isDraggingRef.current = false;
  }, [isRevealed, expenseId, onReveal]);

  // When another item gets revealed, snap this one back
  const prevRevealedRef = useRef(revealedId);
  if (prevRevealedRef.current !== revealedId) {
    prevRevealedRef.current = revealedId;
    if (!isRevealed && contentRef.current) {
      contentRef.current.style.transition = "transform 200ms ease-out";
      contentRef.current.style.transform = "translateX(0)";
      setConfirmDelete(false);
    }
  }

  function handleDeleteAction() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete();
  }

  function handleContentClick(e: React.MouseEvent) {
    if (isRevealed) {
      e.stopPropagation();
      onReveal(null);
      if (contentRef.current) {
        contentRef.current.style.transition = "transform 200ms ease-out";
        contentRef.current.style.transform = "translateX(0)";
      }
      setConfirmDelete(false);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Delete button (behind the content) */}
      <div className="absolute inset-y-0 right-0 flex w-20 items-center justify-center">
        <button
          type="button"
          onClick={handleDeleteAction}
          className={cn(
            "flex h-full w-full flex-col items-center justify-center gap-1 text-xs font-medium text-white transition-colors",
            confirmDelete ? "bg-red-700" : "bg-red-500",
          )}
        >
          <Trash2 className="h-4 w-4" />
          {confirmDelete ? "Seguro?" : "Eliminar"}
        </button>
      </div>

      {/* Swipeable content */}
      <div
        ref={contentRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleContentClick}
        className="relative bg-background"
        style={{
          willChange: "transform",
          transform: `translateX(${offsetX}px)`,
          transition: "transform 200ms ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ============================================
// ExpenseGroups — renders date-grouped items
// ============================================

function ExpenseGroups({
  groups,
  currentMemberId,
  deletingIds,
  newlyCreatedIds,
  forceSettledStyle,
  hideSplitInfo,
  onItemClick,
  keyPrefix,
  swipe,
}: {
  groups: Array<{ label: string; items: SerializedExpense[] }>;
  currentMemberId: string;
  deletingIds: Set<string>;
  newlyCreatedIds: Set<string>;
  forceSettledStyle: boolean;
  hideSplitInfo?: boolean;
  onItemClick: (expense: SerializedExpense) => void;
  keyPrefix: string;
  swipe?: {
    revealedId: string | null;
    onReveal: (id: string | null) => void;
    onDelete: (expenseId: string) => void;
  };
}) {
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={`${keyPrefix}-${group.label}`}>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {group.label}
          </p>
          <div className="space-y-1">
            {group.items.map((expense) => {
              const item = (
                <ExpenseItem
                  key={expense.id}
                  expense={expense}
                  currentMemberId={currentMemberId}
                  isDeleting={deletingIds.has(expense.id)}
                  isNew={newlyCreatedIds.has(expense.id)}
                  forceSettledStyle={forceSettledStyle}
                  hideSplitInfo={hideSplitInfo}
                  onClick={() => onItemClick(expense)}
                />
              );

              if (swipe) {
                return (
                  <SwipeableExpenseItem
                    key={expense.id}
                    expenseId={expense.id}
                    revealedId={swipe.revealedId}
                    onReveal={swipe.onReveal}
                    onDelete={() => swipe.onDelete(expense.id)}
                  >
                    {item}
                  </SwipeableExpenseItem>
                );
              }

              return item;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// ServiceItem — service row in Servicios section
// ============================================

function ServiceItem({
  service,
  isGenerating,
  onGenerate,
  onEdit,
}: {
  service: SerializedService;
  isGenerating: boolean;
  onGenerate: () => void;
  onEdit: () => void;
}) {
  const CategoryIcon = CATEGORY_ICONS[service.category as ExpenseCategory];
  const categoryColorClasses = CATEGORY_COLORS[service.category as ExpenseCategory];

  const dueDate = new Date(service.nextDueDate);
  const now = new Date();
  const isPastDue = dueDate <= now;
  const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const dueLabel = isPastDue
    ? "Vencido"
    : daysUntilDue === 0
      ? "Hoy"
      : daysUntilDue === 1
        ? "Mañana"
        : `${daysUntilDue}d`;

  const hasAmount = service.lastAmount != null;

  return (
    <div
      className="flex items-start gap-3 rounded-xl border-l-2 border-dashed border-primary/30 bg-primary/5 px-3 py-3"
    >
      {/* Category icon with Repeat badge */}
      <button
        type="button"
        onClick={onEdit}
        className="relative mt-0.5 shrink-0"
      >
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${categoryColorClasses}`}>
          <CategoryIcon className="h-4 w-4" />
        </div>
        <Repeat className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-background p-px text-primary" />
      </button>

      {/* Content */}
      <button
        type="button"
        onClick={onEdit}
        className="min-w-0 flex-1 text-left"
      >
        <p className="truncate text-sm font-medium">{service.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {hasAmount
            ? `$${service.lastAmount!.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
            : "Sin monto"}
          {" · "}
          {frequencyLabel(service.frequency as RecurringFrequency)}
        </p>
      </button>

      {/* Due label + Register button */}
      <div className="flex shrink-0 items-center gap-2">
        <span
          className={cn(
            "text-xs",
            isPastDue
              ? "font-medium text-amber-600 dark:text-amber-400"
              : "text-muted-foreground",
          )}
        >
          {dueLabel}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={onGenerate}
          disabled={isGenerating || !hasAmount}
        >
          {isGenerating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            "Registrar"
          )}
        </Button>
      </div>
    </div>
  );
}

// ============================================
// ExpenseList — main component
// ============================================

export function ExpenseList({
  expenses,
  currentMemberId,
  deletingIds,
  newlyCreatedIds,
  onExpenseUpdated,
  onExpenseDeleted,
  activeServices,
  generatingIds,
  onServiceGenerate,
  onServiceEdit,
  onManageServices,
  onCreateService,
  isSolo,
}: ExpenseListProps) {
  const [editingExpense, setEditingExpense] = useState<SerializedExpense | null>(null);
  const [showSettled, setShowSettled] = useState(false);
  const [showAllServices, setShowAllServices] = useState(false);
  const [revealedExpenseId, setRevealedExpenseId] = useState<string | null>(null);

  const pendingExpenses = expenses.filter((expense) => !isExpenseSettled(expense));
  const settledExpenses = expenses.filter((expense) => isExpenseSettled(expense));

  const hasServices = activeServices && activeServices.length > 0;
  const visibleServices = hasServices
    ? showAllServices
      ? activeServices
      : activeServices.slice(0, MAX_SERVICES_COLLAPSED)
    : [];
  const hasMoreServices = hasServices && activeServices.length > MAX_SERVICES_COLLAPSED;

  if (expenses.length === 0 && !hasServices) {
    return (
      <EmptyState
        icon={<Receipt className="h-12 w-12 text-muted-foreground" />}
        title="Registrá el primer gasto"
        message={isSolo
          ? "Anotá tus gastos para llevar el control de tus finanzas."
          : "Anotá los gastos compartidos y Habita calcula quién le debe a quién."}
        action={
          <p className="text-sm text-muted-foreground">
            Usá el botón <span className="font-medium text-foreground">Nuevo gasto</span> de arriba para empezar
          </p>
        }
      />
    );
  }

  // Solo mode: flat chronological list; Multi mode: pending/settled sections
  const allGroups = isSolo ? groupByDate(expenses) : [];
  const pendingGroups = isSolo ? [] : groupByDate(pendingExpenses);
  const settledGroups = isSolo ? [] : groupBySettlementDate(settledExpenses);

  return (
    <div className="mt-4">
      {/* Servicios — wrapped in Card */}
      <Card className="mb-4">
        <CardContent className="py-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Servicios
            </p>
            <div className="flex items-center gap-1">
              {onCreateService && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 px-1.5 text-xs text-muted-foreground"
                  onClick={onCreateService}
                >
                  <Plus className="h-3 w-3" />
                  Nuevo
                </Button>
              )}
              {onManageServices && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground"
                  onClick={onManageServices}
                >
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          {hasServices ? (
            <div className="space-y-1.5">
              {visibleServices.map((service) => (
                <ServiceItem
                  key={service.id}
                  service={service}
                  isGenerating={generatingIds?.has(service.id) ?? false}
                  onGenerate={() => onServiceGenerate?.(service.id)}
                  onEdit={() => onServiceEdit?.(service)}
                />
              ))}
              {hasMoreServices && (
                <button
                  type="button"
                  onClick={() => setShowAllServices((prev) => !prev)}
                  className="flex w-full items-center justify-center gap-1 py-1.5 text-xs font-medium text-primary"
                >
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showAllServices && "rotate-180")} />
                  {showAllServices ? "Colapsar" : `Ver todos (${activeServices!.length})`}
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-muted-foreground/25 px-4 py-5 text-center">
              <p className="text-sm text-muted-foreground">
                Agregá tus servicios fijos: alquiler, expensas, Netflix...
              </p>
              {onCreateService && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-1.5"
                  onClick={onCreateService}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agregar servicio
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section label */}
      {expenses.length > 0 && (
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Gastos recientes
        </p>
      )}

      {isSolo ? (
        /* Solo mode: flat chronological list, no pending/settled distinction */
        <ExpenseGroups
          groups={allGroups}
          currentMemberId={currentMemberId}
          deletingIds={deletingIds}
          newlyCreatedIds={newlyCreatedIds}
          forceSettledStyle={false}
          hideSplitInfo
          onItemClick={setEditingExpense}
          keyPrefix="all"
          swipe={{
            revealedId: revealedExpenseId,
            onReveal: setRevealedExpenseId,
            onDelete: onExpenseDeleted,
          }}
        />
      ) : (
        <>
          {/* Pending expenses */}
          {pendingGroups.length > 0 ? (
            <ExpenseGroups
              groups={pendingGroups}
              currentMemberId={currentMemberId}
              deletingIds={deletingIds}
              newlyCreatedIds={newlyCreatedIds}
              forceSettledStyle={false}
              onItemClick={setEditingExpense}
              keyPrefix="pending"
              swipe={{
                revealedId: revealedExpenseId,
                onReveal: setRevealedExpenseId,
                onDelete: onExpenseDeleted,
              }}
            />
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No hay gastos pendientes
            </p>
          )}

          {/* Toggle settled expenses */}
          {settledExpenses.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setShowSettled(!showSettled)}
                className="mt-4 flex w-full items-center justify-center gap-1.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {showSettled ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" />
                    Ocultar liquidados
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" />
                    Mostrar {settledExpenses.length} liquidado{settledExpenses.length !== 1 ? "s" : ""}
                  </>
                )}
              </button>

              {showSettled && (
                <ExpenseGroups
                  groups={settledGroups}
                  currentMemberId={currentMemberId}
                  deletingIds={deletingIds}
                  newlyCreatedIds={newlyCreatedIds}
                  forceSettledStyle={true}
                  onItemClick={setEditingExpense}
                  keyPrefix="settled"
                />
              )}
            </>
          )}
        </>
      )}

      {editingExpense && (
        <EditExpenseDialog
          expense={editingExpense}
          open
          onClose={() => setEditingExpense(null)}
          onExpenseUpdated={onExpenseUpdated}
          onExpenseDeleted={onExpenseDeleted}
        />
      )}
    </div>
  );
}
