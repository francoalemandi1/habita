import { useEffect } from "react";
import { Stack } from "expo-router";
import { registerDeferredDeleteAppStateFlush } from "@/lib/plata-deferred-delete-appstate";

/** §5.1 — Plata is a stack: level 0 (Gastos/Saldos/Fondo) pushes level 1 detail with back. */
export default function PlataLayout() {
  useEffect(() => registerDeferredDeleteAppStateFlush(), []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
