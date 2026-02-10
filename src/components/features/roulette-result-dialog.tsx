"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Star } from "lucide-react";

import type { MemberType } from "@prisma/client";

interface RouletteResultDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isAssigning: boolean;
  winner: { name: string; memberType: MemberType } | null;
  taskName: string;
  pointsPreview: number;
  isCurrentMember: boolean;
}

export function RouletteResultDialog({
  isOpen,
  onClose,
  onConfirm,
  isAssigning,
  winner,
  taskName,
  pointsPreview,
  isCurrentMember,
}: RouletteResultDialogProps) {
  if (!winner) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="text-center">
          <div className="animate-celebrate-pulse mx-auto text-4xl">🎉</div>
          <DialogTitle className="text-xl">
            {winner.name}
          </DialogTitle>
          <DialogDescription>
            {isCurrentMember ? "¡Te tocó!" : "fue elegido/a"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="rounded-2xl bg-muted/50 p-4 text-center">
            <p className="text-xs text-muted-foreground">Tarea</p>
            <p className="text-lg font-semibold">{taskName}</p>
            <div className="mt-2 flex items-center justify-center gap-1">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">
                {pointsPreview} XP al completar
              </span>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Se creará una asignación para hoy
          </p>
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-center">
          <Button
            variant="outline"
            className="flex-1 rounded-full"
            onClick={onClose}
            disabled={isAssigning}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1 rounded-full"
            onClick={onConfirm}
            disabled={isAssigning}
          >
            {isAssigning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Asignando...
              </>
            ) : (
              "Asignar tarea"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
