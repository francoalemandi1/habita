import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentMember, getCurrentUserMembers } from "@/lib/session";
import { AppNav } from "@/components/features/app-nav";
import { AppNavMobile } from "@/components/features/app-nav-mobile";
import { HouseholdSwitcher } from "@/components/features/household-switcher";

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
  const memberInitial = member.name.charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md">
        <div className="container mx-auto max-w-4xl flex h-14 items-center justify-between gap-2 px-4 md:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/dashboard"
              className="shrink-0 text-lg font-bold tracking-tight text-foreground"
            >
              Habita
            </Link>
            <HouseholdSwitcher
              households={households}
              currentHouseholdId={member.householdId}
              className="flex"
            />
          </div>
          <div className="flex items-center gap-2">
            <AppNav />
            <Link
              href="/profile"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium hover:bg-muted/80 transition-colors"
              aria-label="Perfil"
            >
              {memberInitial}
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-0">{children}</main>
      <AppNavMobile />
    </div>
  );
}
