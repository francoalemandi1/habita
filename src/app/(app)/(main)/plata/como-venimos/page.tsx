import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { ExpenseInsightsView } from "@/components/features/expense-insights-view";

export const metadata = {
  title: "Cómo venimos",
};

export default async function PlataComoVenimosPage(): Promise<React.JSX.Element> {
  const member = await getCurrentMember();
  if (!member) redirect("/onboarding");

  return (
    <div className="flex flex-col gap-6 px-5 py-4">
      <ExpenseInsightsView />
    </div>
  );
}
