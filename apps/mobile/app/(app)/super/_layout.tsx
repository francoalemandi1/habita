import { useEffect } from "react";
import { Stack } from "expo-router";
import { registerDeferredDeleteAppStateFlush } from "@/lib/plata-deferred-delete-appstate";

/** Súper is a stack: level 0 (Lista/Comparar/Ofertas) can push a saved-cart detail. */
export default function SuperLayout() {
  useEffect(() => registerDeferredDeleteAppStateFlush(), []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
