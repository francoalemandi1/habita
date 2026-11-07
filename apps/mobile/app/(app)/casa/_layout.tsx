import { Stack } from "expo-router";

/** §5.1 — Casa is a stack: level 0 (board) pushes level 1 detail with back. */
export default function CasaLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
