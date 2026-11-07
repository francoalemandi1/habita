import { useEffect } from "react";
import { Stack } from "expo-router";
import { registerDeferredDeleteAppStateFlush } from "@/lib/plata-deferred-delete-appstate";

/** Tareas is a stack: level 0 (Semana/Lista/Reparto) pushes rotaciones/sumar, and Plan opens full screen. */
export default function TareasLayout() {
  useEffect(() => registerDeferredDeleteAppStateFlush(), []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="plan/index" options={{ presentation: "fullScreenModal" }} />
    </Stack>
  );
}
