import { redirect } from "next/navigation";

// Hidden for MVP — all rewards page code preserved in git history.
// To re-enable: restore this file from the commit before this change,
// and uncomment the nav items in app-nav.tsx / app-nav-mobile.tsx.

export default function RewardsPage() {
  redirect("/dashboard");
}
