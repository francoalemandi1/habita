import { Redirect } from "expo-router";
import { useMobileAuth } from "@/providers/mobile-auth-provider";

export default function IndexScreen() {
  const { isAuthenticated } = useMobileAuth();
  return <Redirect href={isAuthenticated ? "/(app)/tasks" : "/(auth)/login"} />;
}
