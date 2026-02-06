import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentMember, getCurrentUserMembers } from "@/lib/session";
import { AppNav } from "@/components/features/app-nav";
import { AppNavMobile } from "@/components/features/app-nav-mobile";
import { HouseholdSwitcher } from "@/components/features/household-switcher";
import { AiChatWrapper } from "@/components/features/ai-chat-wrapper";
import { isAIEnabled } from "@/lib/llm/provider";

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

  const isKidsMode = member.memberType === "CHILD";
  const households = allMembers.map((m) => ({ id: m.householdId, name: m.household.name }));
  const aiEnabled = isAIEnabled();

  return (
    <div className="flex min-h-screen flex-col">
      <header
        className={`sticky top-0 z-50 border-b border-border/80 backdrop-blur-md ${
          isKidsMode
            ? "border-primary/30 bg-primary/10"
            : "bg-card/95"
        }`}
      >
        <div className="container flex h-14 items-center justify-between gap-2 px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href={isKidsMode ? "/kids" : "/dashboard"}
              className={`shrink-0 text-lg font-bold tracking-tight ${isKidsMode ? "text-primary" : "text-foreground"}`}
            >
              {isKidsMode ? "🏠 Habita Kids" : "Habita"}
            </Link>
            <HouseholdSwitcher
              households={households}
              currentHouseholdId={member.householdId}
              className="hidden sm:flex"
            />
          </div>
          <AppNav memberType={member.memberType} />
        </div>
      </header>
      <main className="flex-1 pb-20 md:pb-0 pb-safe">{children}</main>
      <AppNavMobile
        memberType={member.memberType}
        households={households}
        currentHouseholdId={member.householdId}
      />
      {/* {!isKidsMode && <AiChatWrapper enabled={aiEnabled} />} */}
    </div>
  );
}
