"use client";

import { Button } from "@/components/ds/button";
import { isEventSaved, useSavedEvents, useToggleSaveEvent } from "@/hooks/use-saved-items";

import type { SaveEventInput } from "@/lib/validations/saved-items";

interface SaveEventButtonProps {
  input: SaveEventInput;
}

/** Event detail (handoff §5.3 "Evento") — "Guardar" using the existing saved-events API. */
export function SaveEventButton({ input }: SaveEventButtonProps): React.JSX.Element {
  const { data: savedEvents } = useSavedEvents();
  const { toggle, isPending } = useToggleSaveEvent();
  const matched = isEventSaved(savedEvents, input.culturalEventId);

  return (
    <Button
      variant={matched ? "secondary" : "primary"}
      loading={isPending}
      loadingLabel="Guardando"
      onClick={() => void toggle(matched ? { savedEventId: matched.id } : { input })}
    >
      {matched ? "Guardado" : "Guardar"}
    </Button>
  );
}
