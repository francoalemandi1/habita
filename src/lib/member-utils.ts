import { cyclingColors } from "@/lib/design-tokens";
import { prisma } from "@/lib/prisma";

/** Returns a stable color for a member based on their position in the members list. */
export function getMemberColor(memberId: string, allMembers: { id: string }[]): string {
  const index = allMembers.findIndex((m) => m.id === memberId);
  const safeIndex = index === -1 ? 0 : index;
  return cyclingColors[safeIndex % cyclingColors.length]!;
}

/** Returns the first letter of a name, uppercased. */
export function getInitial(name: string): string {
  return (name[0] ?? "?").toUpperCase();
}

/** Verifies that every given member id belongs to the household and is active. */
export async function assertMembersBelongToHousehold(
  memberIds: string[],
  householdId: string,
): Promise<boolean> {
  const uniqueIds = Array.from(new Set(memberIds));
  const count = await prisma.member.count({
    where: { id: { in: uniqueIds }, householdId, isActive: true },
  });
  return count === uniqueIds.length;
}
