import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { SuggestTasksView } from "@/components/features/suggest-tasks-view";

export const metadata = {
  title: "Sugerir Tareas",
};

export default async function SuggestTasksPage() {
  const member = await getCurrentMember();
  if (!member) redirect("/onboarding");

  return (
    <div className="container max-w-4xl px-4 py-6 sm:py-8 md:px-8">
      <SuggestTasksView />
    </div>
  );
}
