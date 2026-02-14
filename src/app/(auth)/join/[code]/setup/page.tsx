import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SetupForm } from "./setup-form";

interface SetupPageProps {
  params: Promise<{ code: string }>;
}

export default async function JoinSetupPage({ params }: SetupPageProps) {
  const { code } = await params;
  const normalizedCode = code.trim().toUpperCase();

  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Verify member exists in the household with this invite code
  const member = await prisma.member.findFirst({
    where: {
      userId: session.user.id,
      household: { inviteCode: normalizedCode },
    },
    select: {
      id: true,
      household: { select: { name: true } },
    },
  });

  if (!member) {
    redirect(`/join/${normalizedCode}`);
  }

  return (
    <div className="rounded-2xl border-2 border-border/60 bg-card p-6 shadow-lg sm:p-8">
      <SetupForm householdName={member.household.name} />
    </div>
  );
}
