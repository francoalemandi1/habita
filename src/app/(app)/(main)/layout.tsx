import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentMember, getCurrentUserMembers } from "@/lib/session";
import { hasPendingAvisos } from "@/lib/avisos-indicator";
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

  const hasUnreadNotifications = await hasPendingAvisos(member.id);
  const households = allMembers.map((m) => ({ id: m.householdId, name: m.household.name }));

  return (
    <div className="flex min-h-screen">
      <a
        href="#contenido"
        className="sr-only rounded-[12px] bg-ink text-[15px] font-semibold text-paper outline-none focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:px-4 focus:py-3 focus-visible:ring-2 focus-visible:ring-monte"
      >
        Saltar al contenido
      </a>
      <AppNav
        household={{ name: member.household.name }}
        member={{ name: member.name }}
        households={households}
        currentHouseholdId={member.householdId}
        hasUnreadNotifications={hasUnreadNotifications}
      />
      <main
        id="contenido"
        tabIndex={-1}
        className="min-w-0 flex-1 overflow-x-clip pb-[calc(5rem+env(safe-area-inset-bottom,0px))] outline-none md:pb-0"
      >
        <OfflineBanner />
        {children}
      </main>
      <AppNavMobile />
      <AnotarSheet />
      <AiJobWatcher />
    </div>
  );
}

