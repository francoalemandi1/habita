"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api-client";
import { Loader2, Plus, Package, Trash2, Pencil } from "lucide-react";
import { iconSize } from "@/lib/design-tokens";

import type { SerializedInventoryItem } from "@/types/household";
import type { InventoryStatus } from "@prisma/client";

const STATUS_CONFIG: Record<InventoryStatus, { label: string; color: string; bgColor: string; order: number }> = {
  NEED: { label: "Falta", color: "text-red-600 dark:text-red-400", bgColor: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800", order: 0 },
  LOW: { label: "Poco", color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800", order: 1 },
  HAVE: { label: "Tenemos", color: "text-green-600 dark:text-green-400", bgColor: "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800", order: 2 },
};

const STATUS_CYCLE: InventoryStatus[] = ["HAVE", "LOW", "NEED"];

function nextStatus(current: InventoryStatus): InventoryStatus {
  const idx = STATUS_CYCLE.indexOf(current);
  const nextIdx = (idx + 1) % STATUS_CYCLE.length;
  return STATUS_CYCLE[nextIdx]!;
}

export function HouseholdInventory() {
  const [items, setItems] = useState<SerializedInventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const toast = useToast();

  const fetchItems = useCallback(async () => {
    try {
      const result = await apiFetch<SerializedInventoryItem[]>("/api/inventory");
      setItems(result);
    } catch {
      toast.error("Error", "No se pudo cargar el inventario");
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  async function handleCreate() {
    if (!newName.trim()) return;

    setIsCreating(true);
    try {
      const item = await apiFetch<SerializedInventoryItem>("/api/inventory", {
        method: "POST",
        body: { name: newName.trim(), status: "HAVE" },
      });
      setItems((prev) => [item, ...prev]);
      setNewName("");
    } catch {
      toast.error("Error", "No se pudo agregar el item");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleToggleStatus(item: SerializedInventoryItem) {
    const newStatus = nextStatus(item.status);
    const previousItems = items;

    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: newStatus } : i)),
    );

    try {
      await apiFetch(`/api/inventory/${item.id}`, {
        method: "PATCH",
        body: { status: newStatus },
      });
    } catch {
      setItems(previousItems);
      toast.error("Error", "No se pudo actualizar");
    }
  }

  async function handleDelete(itemId: string) {
    const previousItems = items;
    setItems((prev) => prev.filter((i) => i.id !== itemId));

    try {
      await apiFetch(`/api/inventory/${itemId}`, { method: "DELETE" });
    } catch {
      setItems(previousItems);
      toast.error("Error", "No se pudo eliminar");
    }
  }

  function startEditing(item: SerializedInventoryItem) {
    setEditingId(item.id);
    setEditName(item.name);
    setEditQuantity(item.quantity?.toString() ?? "");
  }

  async function handleSaveEdit() {
    if (!editingId || !editName.trim()) return;

    const previousItems = items;
    const parsedQuantity = editQuantity ? parseInt(editQuantity, 10) : null;

    setItems((prev) =>
      prev.map((i) =>
        i.id === editingId
          ? { ...i, name: editName.trim(), quantity: isNaN(parsedQuantity ?? NaN) ? null : parsedQuantity }
          : i,
      ),
    );
    setEditingId(null);

    try {
      await apiFetch(`/api/inventory/${editingId}`, {
        method: "PATCH",
        body: {
          name: editName.trim(),
          quantity: isNaN(parsedQuantity ?? NaN) ? null : parsedQuantity,
        },
      });
    } catch {
      setItems(previousItems);
      toast.error("Error", "No se pudo actualizar");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className={`${iconSize.lg} animate-spin text-muted-foreground`} />
      </div>
    );
  }

  // Group items by status
  const grouped = {
    NEED: items.filter((i) => i.status === "NEED"),
    LOW: items.filter((i) => i.status === "LOW"),
    HAVE: items.filter((i) => i.status === "HAVE"),
  };

  return (
    <div className="space-y-4">
      {/* Quick add */}
      <div className="flex gap-2">
        <Input
          placeholder="Agregar item..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          maxLength={100}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
        />
        <Button
          onClick={handleCreate}
          disabled={!newName.trim() || isCreating}
          className="shrink-0 gap-1"
        >
          {isCreating ? <Loader2 className={`${iconSize.sm} animate-spin`} /> : <Plus className={iconSize.sm} />}
          Agregar
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <Package className={`${iconSize.xl} text-muted-foreground/50`} />
          <p className="text-sm text-muted-foreground">
            El inventario está vacío
          </p>
          <p className="text-xs text-muted-foreground">
            Agregá items para llevar un control de lo que tienen en casa
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {(["NEED", "LOW", "HAVE"] as InventoryStatus[]).map((status) => {
            const groupItems = grouped[status];
            if (groupItems.length === 0) return null;

            const config = STATUS_CONFIG[status];

            return (
              <div key={status}>
                <div className="mb-2 flex items-center gap-2">
                  <span className={`text-xs font-semibold ${config.color}`}>
                    {config.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({groupItems.length})
                  </span>
                </div>
                <div className="space-y-1.5">
                  {groupItems.map((item) => {
                    const isEditing = editingId === item.id;

                    return (
                      <Card key={item.id} className={`border ${config.bgColor}`}>
                        <CardContent className="py-2.5">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                maxLength={100}
                                autoFocus
                                className="flex-1"
                              />
                              <Input
                                type="number"
                                placeholder="Cant."
                                value={editQuantity}
                                onChange={(e) => setEditQuantity(e.target.value)}
                                min="0"
                                max="9999"
                                className="w-16"
                              />
                              <Button size="sm" className="h-8" onClick={handleSaveEdit}>
                                OK
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8" onClick={() => setEditingId(null)}>
                                X
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              {/* Status toggle button */}
                              <button
                                onClick={() => handleToggleStatus(item)}
                                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold transition-colors ${config.color} hover:opacity-80`}
                              >
                                {config.label}
                              </button>

                              <div className="min-w-0 flex-1">
                                <span className="text-sm">{item.name}</span>
                                {item.quantity != null && (
                                  <span className="ml-1 text-xs text-muted-foreground">
                                    x{item.quantity}
                                  </span>
                                )}
                              </div>

                              <div className="flex shrink-0 items-center gap-0.5">
                                <button
                                  onClick={() => startEditing(item)}
                                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                >
                                  <Pencil className={iconSize.xs} />
                                </button>
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                                >
                                  <Trash2 className={iconSize.xs} />
                                </button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
