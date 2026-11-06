import { Stack } from "expo-router";

/** Perfil is a stack: index (Perfil) pushes avisos (Configuración de avisos) and disponibilidad. */
export default function PerfilLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
