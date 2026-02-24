"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api-client";
import { Pin, PinOff, Trash2, Loader2, Plus, StickyNote } from "lucide-react";
import { iconSize } from "@/lib/design-tokens";

import type { SerializedHouseholdNote } from "@/types/household";

export function HouseholdNotes() {
  const [notes, setNotes] = useState<SerializedHouseholdNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const toast = useToast();

  const fetchNotes = useCallback(async () => {
    try {
      const result = await apiFetch<SerializedHouseholdNote[]>("/api/notes");
      setNotes(result);
    } catch {
      toast.error("Error", "No se pudieron cargar las notas");
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  async function handleCreate() {
    if (!newTitle.trim()) return;

    setIsCreating(true);
    try {
      const note = await apiFetch<SerializedHouseholdNote>("/api/notes", {
        method: "POST",
        body: { title: newTitle.trim() },
      });
      setNotes((prev) => [note, ...prev]);
      setNewTitle("");
    } catch {
      toast.error("Error", "No se pudo crear la nota");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleTogglePin(note: SerializedHouseholdNote) {
    const previousNotes = notes;
    // Optimistic update
    setNotes((prev) =>
      prev.map((n) => (n.id === note.id ? { ...n, isPinned: !n.isPinned } : n)),
    );

    try {
      await apiFetch(`/api/notes/${note.id}`, {
        method: "PATCH",
        body: { isPinned: !note.isPinned },
      });
      await fetchNotes();
    } catch {
      setNotes(previousNotes);
      toast.error("Error", "No se pudo actualizar la nota");
    }
  }

  async function handleDelete(noteId: string) {
    const previousNotes = notes;
    setNotes((prev) => prev.filter((n) => n.id !== noteId));

    try {
      await apiFetch(`/api/notes/${noteId}`, { method: "DELETE" });
    } catch {
      setNotes(previousNotes);
      toast.error("Error", "No se pudo eliminar la nota");
    }
  }

  function startEditing(note: SerializedHouseholdNote) {
    setEditingId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content ?? "");
  }

  async function handleSaveEdit() {
    if (!editingId || !editTitle.trim()) return;

    const previousNotes = notes;
    setNotes((prev) =>
      prev.map((n) =>
        n.id === editingId ? { ...n, title: editTitle.trim(), content: editContent.trim() || null } : n,
      ),
    );
    setEditingId(null);

    try {
      await apiFetch(`/api/notes/${editingId}`, {
        method: "PATCH",
        body: { title: editTitle.trim(), content: editContent.trim() || null },
      });
      await fetchNotes();
    } catch {
      setNotes(previousNotes);
      toast.error("Error", "No se pudo actualizar la nota");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className={`${iconSize.lg} animate-spin text-muted-foreground`} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quick add */}
      <div className="flex gap-2">
        <Input
          placeholder="Nueva nota..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          maxLength={100}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
        />
        <Button
          onClick={handleCreate}
          disabled={!newTitle.trim() || isCreating}
          className="shrink-0 gap-1"
        >
          {isCreating ? <Loader2 className={`${iconSize.sm} animate-spin`} /> : <Plus className={iconSize.sm} />}
          Agregar
        </Button>
      </div>

      {/* Notes list */}
      {notes.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <StickyNote className={`${iconSize.xl} text-muted-foreground/50`} />
          <p className="text-sm text-muted-foreground">
            No hay notas todavía
          </p>
          <p className="text-xs text-muted-foreground">
            Compartí notas con tu hogar para recordar cosas importantes
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => {
            const isEditing = editingId === note.id;

            return (
              <Card
                key={note.id}
                className={`transition-colors ${
                  note.isPinned
                    ? "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30"
                    : ""
                }`}
              >
                <CardContent className="py-3">
                  {isEditing ? (
                    <div className="space-y-2">
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        maxLength={100}
                        autoFocus
                      />
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        maxLength={2000}
                        rows={3}
                        placeholder="Contenido (opcional)"
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                          Cancelar
                        </Button>
                        <Button size="sm" onClick={handleSaveEdit}>
                          Guardar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <button
                        className="min-w-0 flex-1 text-left"
                        onClick={() => startEditing(note)}
                      >
                        <p className="font-medium text-sm">{note.title}</p>
                        {note.content && (
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">
                            {note.content}
                          </p>
                        )}
                        <p className="mt-1 text-[10px] text-muted-foreground/60">
                          {note.createdBy.name}
                          {" · "}
                          {new Date(note.updatedAt).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                        </p>
                      </button>

                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          onClick={() => handleTogglePin(note)}
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          {note.isPinned ? <PinOff className={iconSize.sm} /> : <Pin className={iconSize.sm} />}
                        </button>
                        <button
                          onClick={() => handleDelete(note.id)}
                          className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                        >
                          <Trash2 className={iconSize.sm} />
                        </button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
