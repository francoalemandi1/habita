"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Receipt, ClipboardCheck, ShoppingCart } from "lucide-react";
import { Sheet } from "@/components/ds/sheet";
import { ListRow } from "@/components/ds/list-row";
import { APP_ROUTES } from "@habita/contracts";
import { shouldOpenAnotarFromKeydown } from "@/components/features/anotar/anotar-shortcut";
import { ANOTAR_OPEN_EVENT } from "@/components/features/anotar/anotar-events";

/**
 * R3 interim "Anotar" entry point (§6.15, §7). The real Composer with
 * inline forms for gasto/tarea/ítem lands in R8; for now each row routes to
 * the place that already owns that creation flow. Self-contained: mount once
 * in the layout, the sidebar and tab bar trigger it via `ANOTAR_OPEN_EVENT`.
 */
export function AnotarSheet(): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function handleOpenEvent() {
      setOpen(true);
    }
    function handleKeydown(event: KeyboardEvent) {
      const target = event.target;
      const shouldOpen = shouldOpenAnotarFromKeydown({
        key: event.key,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        target: target instanceof HTMLElement
          ? { tagName: target.tagName, isContentEditable: target.isContentEditable }
          : null,
      });
      if (!shouldOpen) return;
      event.preventDefault();
      setOpen(true);
    }
    window.addEventListener(ANOTAR_OPEN_EVENT, handleOpenEvent);
    document.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener(ANOTAR_OPEN_EVENT, handleOpenEvent);
      document.removeEventListener("keydown", handleKeydown);
    };
  }, []);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen} title="Anotar">
      <ListRow leadingIcon={Receipt} title="Gasto" onClick={() => go(`${APP_ROUTES.plata}?anotar=gasto`)} />
      <ListRow leadingIcon={ClipboardCheck} title="Tarea" onClick={() => go(APP_ROUTES.tareas)} />
      <ListRow leadingIcon={ShoppingCart} title="Ítem de la lista" onClick={() => go(APP_ROUTES.super)} />
    </Sheet>
  );
}
