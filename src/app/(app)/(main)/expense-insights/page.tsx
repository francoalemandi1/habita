import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { ExpenseInsightsView } from "@/components/features/expense-insights-view";

export const metadata = {
  title: "Análisis de Gastos",
};

export default async function ExpenseInsightsPage() {
  const member = await getCurrentMember();
  if (!member) redirect("/onboarding");

  return (
    <div className="container max-w-4xl px-4 py-6 sm:py-8 md:px-8">
      <ExpenseInsightsView />
    </div>
  );
}
