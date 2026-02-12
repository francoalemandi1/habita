"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Trophy } from "lucide-react";

import type { MemberType } from "@prisma/client";

interface RouletteResultDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isAssigning: boolean;
  winner: { name: string; memberType: MemberType } | null;
  taskName: string;
  isCurrentMember: boolean;
}

export function RouletteResultDialog({
  isOpen,
  onClose,
  onConfirm,
  isAssigning,
  winner,
  taskName,
  isCurrentMember,
}: RouletteResultDialogProps) {
  if (!winner) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="text-center">
          <div className="animate-result-pop-in mx-auto mb-1">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Trophy className="h-8 w-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-2xl animate-winner-shimmer">
            {winner.name}
          </DialogTitle>
          <DialogDescription className="text-base">
            {isCurrentMember ? "¡Te tocó!" : "fue elegido/a"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="rounded-2xl bg-muted/50 p-4 text-center">
            <p className="text-xs text-muted-foreground">Tarea</p>
            <p className="text-lg font-semibold">{taskName}</p>
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
