"use client";

import { useFund } from "@/hooks/use-fund";
import { FundView } from "@/components/features/fund-view";

import type { MemberOption } from "@/types/expense";

interface FundPageProps {
  allMembers: MemberOption[];
  currentMemberId: string;
}

export function FundPage({ allMembers, currentMemberId }: FundPageProps) {
  const { fund, isLoading, setup, contribute, updateAllocations } = useFund();

  return (
    <FundView
      fund={fund}
      isLoading={isLoading}
      allMembers={allMembers}
      currentMemberId={currentMemberId}
      onSetup={setup}
      onContribute={contribute}
      onUpdateAllocations={updateAllocations}
    />
  );
}
