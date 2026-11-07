import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentMember, getCurrentUserMembers } from "@/lib/session";
import { AppNav } from "@/components/features/app-nav";
import { AppNavMobile } from "@/components/features/app-nav-mobile";
import { AnotarSheet } from "@/components/features/anotar/anotar-sheet";
import { AiJobWatcher } from "@/components/features/ai-job-watcher";
import { OfflineBanner } from "@/components/features/offline-banner";

interface MainLayoutProps {
  children: ReactNode;
}

export default async function MainLayout({ children }: MainLayoutProps) {
  const [member, allMembers] = await Promise.all([
    getCurrentMember(),
    getCurrentUserMembers(),
  ]);

  if (!member) {
    redirect("/onboarding");
  }

  const households = allMembers.map((m) => ({ id: m.householdId, name: m.household.name }));

  return (
    <div className="flex min-h-screen">
      <AppNav
        household={{ name: member.household.name }}
        member={{ name: member.name }}
        households={households}
        currentHouseholdId={member.householdId}
      />
      <main className="flex-1 overflow-x-hidden pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
        <OfflineBanner />
        {children}
      </main>
      <AppNavMobile />
      <AnotarSheet />
      <AiJobWatcher />
    </div>
  );
}
