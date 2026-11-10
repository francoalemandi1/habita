import { notFound, redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { loadExpenseDetail } from "@/lib/expense-detail-loader";
import { ExpenseDetailView } from "@/components/features/plata/expense-detail/expense-detail-view";

interface ExpenseDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ExpenseDetailPage({ params }: ExpenseDetailPageProps): Promise<React.JSX.Element> {
  const member = await getCurrentMember();
  if (!member) {
    redirect("/onboarding");
  }

  const { id } = await params;

  const detail = await loadExpenseDetail({
    householdId: member.householdId,
    expenseId: id,
    currentMemberId: member.id,
    memberType: member.memberType,
  });

  if (!detail) {
    notFound();
  }

  return (
    <ExpenseDetailView
      expense={detail.expense}
      currentMemberId={member.id}
      canEdit={detail.canEdit}
      hasLaterSettlement={detail.hasLaterSettlement}
      invoice={detail.invoice}
    />
  );
}
